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
  var RELEASE_CACHE_KEY = "rbitcoin:release-info:v2";
  var RELEASE_CACHE_TTL_MS = 15 * 60 * 1000;

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

  function sortReleasesDesc(releases) {
    var parsed = [];
    if (!Array.isArray(releases)) return parsed;
    for (var i = 0; i < releases.length; i++) {
      var rel = releases[i];
      if (!rel || rel.draft || rel.prerelease) continue;
      var item = parseReleasedSemver(rel.tag_name);
      if (!item) continue;
      item.htmlUrl =
        rel.html_url ||
        "https://github.com/reardencode/rbitcoin/releases/tag/" + encodeURIComponent(item.tag);
      parsed.push(item);
    }
    parsed.sort(function (a, b) {
      return semverGreater(a, b) ? -1 : semverGreater(b, a) ? 1 : 0;
    });
    return parsed;
  }

  function buildReleaseInfo(releases) {
    var sorted = sortReleasesDesc(releases);
    if (!sorted.length) return null;
    var latest = sorted[0];
    var prev = sorted[1] || null;
    var minor = latest.major + "." + latest.minor;
    return {
      version: latest.version,
      minor: minor,
      line: minor + ".x",
      lineTag: "v" + minor + ".x",
      tag: latest.tag,
      htmlUrl: latest.htmlUrl,
      prevVersion: prev ? prev.version : "",
      prevLine: prev ? prev.major + "." + prev.minor + ".x" : "",
      nextMinor: latest.major + "." + (latest.minor + 1),
      cachedAt: Date.now(),
    };
  }

  function setTextAll(selector, value) {
    if (!value) return;
    document.querySelectorAll(selector).forEach(function (el) {
      el.textContent = value;
    });
  }

  function applyRelease(info) {
    if (!info || !info.version || !info.htmlUrl) return;
    setTextAll("[data-release-version]", info.version);
    setTextAll("[data-release-minor]", info.minor);
    setTextAll("[data-release-line]", info.line);
    setTextAll("[data-release-line-tag]", info.lineTag);
    setTextAll("[data-release-prev-version]", info.prevVersion);
    setTextAll("[data-release-prev-line]", info.prevLine);
    setTextAll("[data-release-next-minor]", info.nextMinor);
    document.querySelectorAll("[data-release-link]").forEach(function (el) {
      el.setAttribute("href", info.htmlUrl);
      el.textContent = info.version;
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

  function writeReleaseCache(info) {
    try {
      sessionStorage.setItem(RELEASE_CACHE_KEY, JSON.stringify(info));
    } catch (_) {
      /* ignore quota / private mode */
    }
  }

  function fetchReleaseInfo() {
    return fetch(RELEASES_URL, { headers: { Accept: "application/vnd.github+json" } })
      .then(function (res) {
        if (!res.ok) throw new Error("releases " + res.status);
        return res.json();
      })
      .then(function (releases) {
        return buildReleaseInfo(releases);
      });
  }

  function loadHighestRelease() {
    var cached = readReleaseCache();
    if (cached) {
      applyRelease(cached);
    }

    fetchReleaseInfo()
      .then(function (info) {
        if (!info) return;
        if (!cached || cached.version !== info.version) {
          writeReleaseCache(info);
          applyRelease(info);
        }
      })
      .catch(function () {
        /* keep fallback copy and /releases/latest links in place */
      });
  }

  loadHighestRelease();
})();
