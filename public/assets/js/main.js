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

  var COVERAGE_RAW_URL =
    "https://raw.githubusercontent.com/reardencode/rbitcoin/badges/coverage.json";
  var COVERAGE_API_URL =
    "https://api.github.com/repos/reardencode/rbitcoin/contents/coverage.json?ref=badges";
  var COVERAGE_CACHE_KEY = "rbitcoin:coverage:v1";
  var COVERAGE_CACHE_TTL_MS = 15 * 60 * 1000;

  function coverageFromPayload(d) {
    if (!d || d.message == null) return null;
    var ratio = "";
    if (typeof d.lh === "number" && typeof d.lf === "number") {
      ratio = d.lh + " / " + d.lf;
    }
    return {
      message: String(d.message),
      ratio: ratio,
      date: d.date ? String(d.date) : "",
      cachedAt: Date.now(),
    };
  }

  function applyCoverage(info) {
    if (!info || !info.message) return;
    setTextAll("[data-coverage-message]", info.message);
    if (info.ratio) setTextAll("[data-coverage-ratio]", info.ratio);
    if (info.date) setTextAll("[data-coverage-date]", info.date);
  }

  function readCoverageCache() {
    try {
      var raw = sessionStorage.getItem(COVERAGE_CACHE_KEY);
      if (!raw) return null;
      var cached = JSON.parse(raw);
      if (!cached || !cached.message || !cached.cachedAt) return null;
      if (Date.now() - cached.cachedAt > COVERAGE_CACHE_TTL_MS) return null;
      return cached;
    } catch (_) {
      return null;
    }
  }

  function writeCoverageCache(info) {
    try {
      sessionStorage.setItem(COVERAGE_CACHE_KEY, JSON.stringify(info));
    } catch (_) {
      /* ignore quota / private mode */
    }
  }

  function fetchCoverage() {
    return fetch(COVERAGE_RAW_URL, { cache: "no-store" })
      .then(function (res) {
        if (!res.ok) throw new Error("coverage raw " + res.status);
        return res.json();
      })
      .then(coverageFromPayload)
      .catch(function () {
        return fetch(COVERAGE_API_URL, {
          headers: { Accept: "application/vnd.github+json" },
        })
          .then(function (res) {
            if (!res.ok) throw new Error("coverage api " + res.status);
            return res.json();
          })
          .then(function (body) {
            if (!body || !body.content) throw new Error("coverage api empty");
            var raw = String(body.content).replace(/\n/g, "");
            return coverageFromPayload(JSON.parse(atob(raw)));
          });
      });
  }

  function loadCoverage() {
    var cached = readCoverageCache();
    if (cached) {
      applyCoverage(cached);
    }

    fetchCoverage()
      .then(function (info) {
        if (!info) return;
        if (!cached || cached.message !== info.message || cached.ratio !== info.ratio) {
          writeCoverageCache(info);
          applyCoverage(info);
        }
      })
      .catch(function () {
        /* keep HTML fallback */
      });
  }

  loadHighestRelease();
  loadCoverage();
})();
