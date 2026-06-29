(function () {
  function fold(value) {
    return String(value || "")
      .replace(/\u00ad/g, "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }

  function relPath(fromPath, toPath) {
    var fromParts = String(fromPath || "index.html").split("/");
    fromParts.pop();
    var toParts = String(toPath || "index.html").split("/");
    while (fromParts.length && toParts.length && fromParts[0] === toParts[0]) {
      fromParts.shift();
      toParts.shift();
    }
    var rel = "../".repeat(fromParts.length) + toParts.join("/");
    return rel || "index.html";
  }

  function init(input) {
    var results = input.parentElement.querySelector("[data-search-results]");
    var index = (window.DPPN_SEARCH || []).map(function (item) {
      return Object.assign({}, item, {
        folded: fold([item.id, item.headword, item.base_headword].join(" "))
      });
    });

    input.addEventListener("input", function () {
      var query = fold(input.value.trim());
      if (query.length < 2) {
        results.hidden = true;
        results.innerHTML = "";
        return;
      }
      var matches = index.filter(function (item) {
        return item.folded.indexOf(query) !== -1;
      }).slice(0, 12);
      results.innerHTML = matches.map(function (item) {
        return '<a href="' + relPath(window.DPPN_CURRENT_PATH, item.path) + '#' + item.anchor + '"><span>' + item.headword + '</span><small>' + item.letter + '</small></a>';
      }).join("");
      results.hidden = matches.length === 0;
    });
  }

  function initReaderControls() {
    var header = document.querySelector(".header-main");
    if (!header || header.querySelector("[data-reader-controls]")) {
      return;
    }

    var sizes = [18, 20, 22, 24, 26];
    var storageKey = "dppn-reader-font-size";
    var current = Number(readStoredSize()) || 20;
    if (sizes.indexOf(current) === -1) {
      current = 20;
    }

    function readStoredSize() {
      try {
        return localStorage.getItem(storageKey);
      } catch (error) {
        return null;
      }
    }

    function writeStoredSize(size) {
      try {
        localStorage.setItem(storageKey, String(size));
      } catch (error) {
        return;
      }
    }

    function applySize(size) {
      current = size;
      document.documentElement.style.setProperty("--reader-font-size", size + "px");
      writeStoredSize(size);
    }

    function step(delta) {
      var index = sizes.indexOf(current);
      var next = Math.max(0, Math.min(sizes.length - 1, index + delta));
      applySize(sizes[next]);
    }

    var wrap = document.createElement("div");
    wrap.className = "reader-controls";
    wrap.dataset.readerControls = "";
    wrap.setAttribute("aria-label", "Text size");
    wrap.innerHTML = '<button class="reader-font-btn" type="button" data-reader-font="-1" aria-label="Decrease text size" title="Decrease text size">A-</button><button class="reader-font-btn" type="button" data-reader-font="1" aria-label="Increase text size" title="Increase text size">A+</button>';
    wrap.addEventListener("click", function (event) {
      var button = event.target.closest("[data-reader-font]");
      if (button) {
        step(Number(button.dataset.readerFont));
      }
    });

    var topLinks = header.querySelector(".top-links");
    header.insertBefore(wrap, topLinks || null);
    applySize(current);
  }

  function initLanguageToggle() {
    var storageKey = "dppn-language";
    var body = document.body;
    var toggle = document.querySelector(".lang-toggle");
    if (!body || !toggle) {
      return;
    }

    function readStoredLanguage() {
      try {
        return localStorage.getItem(storageKey);
      } catch (error) {
        return null;
      }
    }

    function writeStoredLanguage(lang) {
      try {
        localStorage.setItem(storageKey, lang);
      } catch (error) {
        return;
      }
    }

    function pageSupportsLanguage(lang) {
      return Boolean(document.querySelector(".lang-" + lang));
    }

    function applyLanguage(lang, persist) {
      if (lang !== "vi" && lang !== "en") {
        lang = body.dataset.defaultLang || "en";
      }
      if (!pageSupportsLanguage(lang)) {
        lang = body.dataset.defaultLang || "en";
      }
      body.classList.toggle("lang-en", lang === "en");
      body.classList.toggle("lang-vi", lang === "vi");
      toggle.querySelectorAll("[data-lang-choice]").forEach(function (button) {
        var active = button.dataset.langChoice === lang;
        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", active ? "true" : "false");
      });
      if (persist) {
        writeStoredLanguage(lang);
      }
    }

    toggle.addEventListener("click", function (event) {
      var button = event.target.closest("[data-lang-choice]");
      if (button) {
        applyLanguage(button.dataset.langChoice, true);
      }
    });

    applyLanguage(readStoredLanguage() || body.dataset.defaultLang || "en", false);
  }

  document.querySelectorAll("[data-search]").forEach(init);
  initReaderControls();
  initLanguageToggle();
  document.addEventListener("keydown", function (event) {
    if (event.key === "/" && !/input|textarea/i.test(document.activeElement.tagName)) {
      var input = document.querySelector("[data-search]");
      if (input) {
        event.preventDefault();
        input.focus();
      }
    }
  });
})();
