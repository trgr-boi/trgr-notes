(function () {
  const IMAGE_EXTENSIONS = [
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".webp",
    ".svg",
    ".bmp",
    ".avif",
  ];
  const AUDIO_EXTENSIONS = [".mp3", ".wav", ".ogg", ".m4a", ".aac", ".flac"];
  const MEDIA_EXTENSIONS = [...IMAGE_EXTENSIONS, ...AUDIO_EXTENSIONS];

  function hasKnownExtension(name, extensions) {
    const lower = String(name || "").toLowerCase();
    return extensions.some((ext) => lower.endsWith(ext));
  }

  function parseManifestCandidates(root) {
    const raw = root.dataset.previewManifests || "./files.json";
    return raw
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
  }

  function normalizeManifestHref(rawName, manifestPath) {
    const name = String(rawName || "").trim();
    if (!name) return "";

    if (
      name.startsWith("/") ||
      name.startsWith("./") ||
      name.startsWith("../") ||
      /^[a-zA-Z]+:\/\//.test(name)
    ) {
      return name;
    }

    const manifestDir = manifestPath.replace(/\/[^/]*$/, "") || ".";
    return `${manifestDir}/${name}`;
  }

  function getFilenameFromHref(href) {
    const value = String(href || "").trim();
    if (!value) return "";

    const path = value.split(/[?#]/)[0];
    return path.split("/").pop() || path;
  }

  function initFileBrowser(root) {
    const listEl = document.getElementById(
      root.dataset.previewListId || "file-list",
    );
    const statusEl = document.getElementById(
      root.dataset.previewStatusId || "status",
    );

    if (!listEl || !statusEl) {
      return;
    }

    const manifestCandidates = parseManifestCandidates(root);

    function addItem(href, name, comment) {
      const row = document.createElement("p");
      const link = document.createElement("a");

      link.href = href;
      link.textContent = name;
      if (comment) {
        link.dataset.previewComment = comment;
      }

      row.appendChild(link);
      listEl.appendChild(row);
    }

    async function loadFromManifest() {
      const allEntries = [];

      for (const manifestPath of manifestCandidates) {
        try {
          const res = await fetch(manifestPath, { cache: "no-store" });
          if (!res.ok) continue;

          const data = await res.json();
          if (!Array.isArray(data)) continue;

          data
            .map((entry) => {
              if (typeof entry === "string") {
                const href = normalizeManifestHref(entry, manifestPath);
                if (!href) return null;

                return {
                  href,
                  text: getFilenameFromHref(href),
                  comment: "",
                };
              }

              if (entry && typeof entry === "object") {
                const href = normalizeManifestHref(
                  entry.file ?? entry.path,
                  manifestPath,
                );
                if (!href) return null;

                const title = String(entry.title || "").trim();

                return {
                  href,
                  text: title || getFilenameFromHref(href),
                  comment: String(entry.comment || "").trim(),
                };
              }

              return null;
            })
            .filter(Boolean)
            .filter(
              (entry) =>
                entry.href !== "index.html" && entry.href !== "files.json",
            )
            .forEach((entry) => {
              allEntries.push(entry);
            });
        } catch (_) {
          // Ignore missing or invalid manifests.
        }
      }

      const deduped = Array.from(
        new Map(allEntries.map((entry) => [entry.href, entry])).values(),
      );

      if (!deduped.length) {
        throw new Error("No manifest");
      }

      return deduped;
    }

    async function loadFromDirectoryHtml() {
      try {
        const res = await fetch(".", { cache: "no-store" });
        const html = await res.text();
        const doc = new DOMParser().parseFromString(html, "text/html");
        const links = Array.from(doc.querySelectorAll("a[href]"));

        return links
          .map((a) => ({
            href: a.getAttribute("href"),
            text: (a.textContent || "").trim(),
            comment: "",
          }))
          .filter((item) => item.href && item.text)
          .filter((item) => item.text !== "../" && item.href !== "../")
          .filter(
            (item) => !item.text.toLowerCase().includes("parent directory"),
          )
          .filter(
            (item) => item.text !== "index.html" && item.text !== "files.json",
          )
          .filter((item) => hasKnownExtension(item.href, MEDIA_EXTENSIONS));
      } catch (_) {
        return [];
      }
    }

    async function loadDirectoryListing() {
      listEl.innerHTML = "";

      let entries = [];

      try {
        entries = await loadFromManifest();
      } catch (_) {
        entries = await loadFromDirectoryHtml();
      }

      if (!entries.length) {
        statusEl.innerHTML = "<i>No files found.</i>";
        return;
      }

      entries.forEach((item) => addItem(item.href, item.text, item.comment));

      statusEl.innerHTML = `<i>${entries.length} file${entries.length === 1 ? "" : "s"}</i>`;
    }

    loadDirectoryListing();
  }

  document.addEventListener("DOMContentLoaded", function () {
    document
      .querySelectorAll("[data-preview-browser]")
      .forEach(initFileBrowser);
  });
})();
