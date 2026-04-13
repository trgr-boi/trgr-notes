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

  function initPreviewBrowser(root) {
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

    let previewBlockEl = null;
    let previewBodyEl = null;
    let currentPreviewHref = "";
    let currentPreviewAnchorEl = null;

    function stopPreviewAudioIfPlaying() {
      if (!previewBodyEl) return;

      const player = previewBodyEl.querySelector("audio");
      if (!player) return;

      try {
        player.pause();
      } catch (_) {
        // Ignore playback pause failures.
      }
    }

    function removePreviewBlock() {
      if (previewBlockEl) {
        previewBlockEl.remove();
      }

      previewBlockEl = null;
      previewBodyEl = null;
      currentPreviewHref = "";
      currentPreviewAnchorEl = null;
    }

    function ensurePreviewBlock(anchorEl) {
      if (!previewBlockEl) {
        previewBlockEl = document.createElement("section");
        previewBlockEl.className = "preview-block";
        previewBlockEl.setAttribute("aria-live", "polite");

        const header = document.createElement("div");
        header.className = "preview-header";

        const title = document.createElement("h2");
        title.textContent = "Preview";

        const actions = document.createElement("div");
        actions.className = "preview-actions";

        const openBtn = document.createElement("button");
        openBtn.type = "button";
        openBtn.className = "preview-open";
        openBtn.setAttribute("aria-label", "Open file in new tab");
        openBtn.textContent = "Open";
        openBtn.addEventListener("click", function () {
          if (currentPreviewHref) {
            stopPreviewAudioIfPlaying();
            window.open(currentPreviewHref, "_blank", "noopener");
          }
        });

        const closeBtn = document.createElement("button");
        closeBtn.type = "button";
        closeBtn.className = "preview-close";
        closeBtn.setAttribute("aria-label", "Close preview");
        closeBtn.textContent = "X";
        closeBtn.addEventListener("click", removePreviewBlock);

        previewBodyEl = document.createElement("div");
        previewBodyEl.className = "preview";

        header.appendChild(title);
        actions.appendChild(openBtn);
        actions.appendChild(closeBtn);
        header.appendChild(actions);
        previewBlockEl.appendChild(header);
        previewBlockEl.appendChild(previewBodyEl);
      }

      anchorEl.insertAdjacentElement("afterend", previewBlockEl);
    }

    function showAudioPreview(href, name, comment, anchorEl) {
      ensurePreviewBlock(anchorEl);
      currentPreviewHref = href;
      currentPreviewAnchorEl = anchorEl;
      previewBodyEl.innerHTML = "";

      const title = document.createElement("p");
      title.innerHTML = `<i>Playing: ${name}</i>`;

      const player = document.createElement("audio");
      player.className = "preview-player";
      player.controls = true;
      player.autoplay = true;
      player.src = href;

      previewBodyEl.appendChild(title);
      if (comment) {
        const note = document.createElement("p");
        note.className = "preview-comment";
        note.textContent = comment;
        previewBodyEl.appendChild(note);
      }
      previewBodyEl.appendChild(player);
    }

    function showImagePreview(href, name, comment, anchorEl) {
      ensurePreviewBlock(anchorEl);
      currentPreviewHref = href;
      currentPreviewAnchorEl = anchorEl;
      previewBodyEl.innerHTML = "";

      const title = document.createElement("p");
      title.innerHTML = `<i>Image: ${name}</i>`;

      const image = document.createElement("img");
      image.className = "preview-image";
      image.src = href;
      image.alt = name;
      image.loading = "lazy";

      previewBodyEl.appendChild(title);
      if (comment) {
        const note = document.createElement("p");
        note.className = "preview-comment";
        note.textContent = comment;
        previewBodyEl.appendChild(note);
      }
      previewBodyEl.appendChild(image);
    }

    function addItem(href, name, comment) {
      const row = document.createElement("p");
      const link = document.createElement("a");

      link.href = href;
      link.textContent = name;
      link.addEventListener("click", function (event) {
        if (hasKnownExtension(name, AUDIO_EXTENSIONS)) {
          event.preventDefault();

          if (
            previewBlockEl &&
            currentPreviewHref === href &&
            currentPreviewAnchorEl === row
          ) {
            removePreviewBlock();
            return;
          }

          showAudioPreview(href, name, comment, row);
          return;
        }

        if (hasKnownExtension(name, IMAGE_EXTENSIONS)) {
          event.preventDefault();

          if (
            previewBlockEl &&
            currentPreviewHref === href &&
            currentPreviewAnchorEl === row
          ) {
            removePreviewBlock();
            return;
          }

          showImagePreview(href, name, comment, row);
        }
      });

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
                  text: href.split("/").pop() || href,
                  comment: "",
                };
              }

              if (entry && typeof entry === "object") {
                const href = normalizeManifestHref(entry.path, manifestPath);
                if (!href) return null;

                return {
                  href,
                  text: href.split("/").pop() || href,
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
      removePreviewBlock();

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

      entries
        .sort((a, b) =>
          a.text.localeCompare(b.text, undefined, { sensitivity: "base" }),
        )
        .forEach((item) => addItem(item.href, item.text, item.comment));

      statusEl.innerHTML = `<i>${entries.length} file${entries.length === 1 ? "" : "s"}</i>`;
    }

    loadDirectoryListing();
  }

  document.addEventListener("DOMContentLoaded", function () {
    document
      .querySelectorAll("[data-preview-browser]")
      .forEach(initPreviewBrowser);
  });
})();
