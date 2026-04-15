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

  function hasKnownExtension(name, extensions) {
    const lower = String(name || "").toLowerCase();
    return extensions.some((ext) => lower.endsWith(ext));
  }

  function initPreviewBrowser(root) {
    const listEl = document.getElementById(
      root.dataset.previewListId || "file-list",
    );
    const previewSlotEl = document.getElementById(
      root.dataset.previewPreviewId || "preview-slot",
    );

    if (!listEl) {
      return;
    }

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

      if (previewSlotEl) {
        previewSlotEl.appendChild(previewBlockEl);
        return;
      }

      anchorEl.insertAdjacentElement("afterend", previewBlockEl);
    }

    function showAudioPreview(href, name, comment, anchorEl) {
      ensurePreviewBlock(anchorEl);
      currentPreviewHref = href;
      currentPreviewAnchorEl = anchorEl;
      previewBodyEl.innerHTML = "";

      const title = document.createElement("p");
      const titleText = document.createElement("i");
      titleText.textContent = `Playing: ${name}`;
      title.appendChild(titleText);

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
      const titleText = document.createElement("i");
      titleText.textContent = `Image: ${name}`;
      title.appendChild(titleText);

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

    listEl.addEventListener("click", function (event) {
      const anchorEl = event.target.closest("a[href]");

      if (!anchorEl || !listEl.contains(anchorEl)) {
        return;
      }

      const href = anchorEl.getAttribute("href") || "";
      const hrefPath = href.split(/[?#]/)[0];
      const name = (anchorEl.textContent || "").trim();
      const comment = String(anchorEl.dataset.previewComment || "").trim();
      const rowEl = anchorEl.closest("p") || anchorEl;

      if (hasKnownExtension(hrefPath, AUDIO_EXTENSIONS)) {
        event.preventDefault();

        if (
          previewBlockEl &&
          currentPreviewHref === href &&
          currentPreviewAnchorEl === rowEl
        ) {
          removePreviewBlock();
          return;
        }

        showAudioPreview(href, name, comment, rowEl);
        return;
      }

      if (hasKnownExtension(hrefPath, IMAGE_EXTENSIONS)) {
        event.preventDefault();

        if (
          previewBlockEl &&
          currentPreviewHref === href &&
          currentPreviewAnchorEl === rowEl
        ) {
          removePreviewBlock();
          return;
        }

        showImagePreview(href, name, comment, rowEl);
      }
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    document
      .querySelectorAll("[data-preview-browser]")
      .forEach(initPreviewBrowser);
  });
})();
