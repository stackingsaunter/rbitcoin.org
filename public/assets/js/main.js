(function () {
  "use strict";

  var nav = document.querySelector("[data-nav]");
  var toggle = document.querySelector("[data-nav-toggle]");

  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });

    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  document.querySelectorAll("[data-copy]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var targetId = btn.getAttribute("data-copy");
      var el = targetId ? document.getElementById(targetId) : null;
      var text = el ? el.textContent : "";
      if (!text) return;

      function done() {
        var prev = btn.textContent;
        btn.textContent = "Copied";
        btn.classList.add("is-copied");
        setTimeout(function () {
          btn.textContent = prev;
          btn.classList.remove("is-copied");
        }, 1600);
      }

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done).catch(function () {
          fallbackCopy(text, done);
        });
      } else {
        fallbackCopy(text, done);
      }
    });
  });

  function fallbackCopy(text, done) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      done();
    } catch (_) {
      /* ignore */
    }
    document.body.removeChild(ta);
  }

  var RELEASES_URL =
    "https://api.github.com/repos/reardencode/rbitcoin/releases?per_page=100";
  var RELEASE_CACHE_KEY = "rbitcoin:highest-release";
  var RELEASE_CACHE_TTL_MS = 60 * 60 * 1000;

  function parseReleasedSemver(tag) {
    var m = String(tag || "").match(/^v?(\d+)\.(\d+)\.(\d+)$/);
    if (!m) return null;
    return {
      major: Number(m[1]),
      minor: Number(m[2]),
      patch: Number(m[3]),
      version: m[1] + "." + m[2] + "." + m[3],
      tag: String(tag),
    };
  }

  function semverGreater(a, b) {
    if (a.major !== b.major) return a.major > b.major;
    if (a.minor !== b.minor) return a.minor > b.minor;
    return a.patch > b.patch;
  }

  function pickHighestRelease(releases) {
    var best = null;
    if (!Array.isArray(releases)) return null;
    for (var i = 0; i < releases.length; i++) {
      var rel = releases[i];
      if (!rel || rel.draft || rel.prerelease) continue;
      var parsed = parseReleasedSemver(rel.tag_name);
      if (!parsed) continue;
      if (!best || semverGreater(parsed, best)) {
        best = parsed;
        best.htmlUrl =
          rel.html_url ||
          "https://github.com/reardencode/rbitcoin/releases/tag/" + parsed.tag;
      }
    }
    return best;
  }

  function applyRelease(release) {
    if (!release || !release.version || !release.htmlUrl) return;
    document.querySelectorAll("[data-release-version]").forEach(function (el) {
      el.textContent = release.version;
    });
    document.querySelectorAll("[data-release-link]").forEach(function (el) {
      el.setAttribute("href", release.htmlUrl);
      el.textContent = release.version;
    });
    document.querySelectorAll("[data-release-wrap]").forEach(function (el) {
      el.removeAttribute("hidden");
    });
  }

  function readReleaseCache() {
    try {
      var raw = sessionStorage.getItem(RELEASE_CACHE_KEY);
      if (!raw) return null;
      var cached = JSON.parse(raw);
      if (!cached || !cached.version || !cached.htmlUrl || !cached.cachedAt) return null;
      if (Date.now() - cached.cachedAt > RELEASE_CACHE_TTL_MS) return null;
      return cached;
    } catch (_) {
      return null;
    }
  }

  function writeReleaseCache(release) {
    try {
      sessionStorage.setItem(
        RELEASE_CACHE_KEY,
        JSON.stringify({
          version: release.version,
          htmlUrl: release.htmlUrl,
          cachedAt: Date.now(),
        })
      );
    } catch (_) {
      /* ignore quota / private mode */
    }
  }

  function loadHighestRelease() {
    if (
      !document.querySelector(
        "[data-release-version], [data-release-link], [data-release-wrap]"
      )
    ) {
      return;
    }

    var cached = readReleaseCache();
    if (cached) {
      applyRelease(cached);
      return;
    }

    fetch(RELEASES_URL, { headers: { Accept: "application/vnd.github+json" } })
      .then(function (res) {
        if (!res.ok) throw new Error("releases " + res.status);
        return res.json();
      })
      .then(function (releases) {
        var best = pickHighestRelease(releases);
        if (!best) return;
        writeReleaseCache(best);
        applyRelease(best);
      })
      .catch(function () {
        /* leave fallback copy and /releases/latest links in place */
      });
  }

  loadHighestRelease();
})();
