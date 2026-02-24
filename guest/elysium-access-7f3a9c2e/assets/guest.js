(function () {
  var SUPPORTED_LANGS = [
    "en",
    "de",
    "fr",
    "bg",
    "sr",
    "ro",
    "el",
    "pl",
    "mk",
    "nl",
    "tr",
  ];
  var DEFAULT_LANG = "en";
  var ACCESS_PIN = "4829";
  var COOKIE_NAME = "eh_guest";
  var COOKIE_MAX_AGE = 2592000;
  var COOKIE_PATH = "/guest/elysium-access-7f3a9c2e";
  var MAP_URL = "https://maps.google.com/?q=Elysium+House";
  var WIFI_SSID = "ELYSIUM_WIFI";
  var WIFI_PASS = "elysium1234";

  function getLangFromPath() {
    var parts = window.location.pathname.split("/").filter(Boolean);
    var lang = parts[parts.length - 1];
    if (SUPPORTED_LANGS.indexOf(lang) === -1) {
      return DEFAULT_LANG;
    }
    return lang;
  }

  function hasGuestCookie() {
    return document.cookie
      .split(";")
      .map(function (item) {
        return item.trim();
      })
      .indexOf(COOKIE_NAME + "=1") !== -1;
  }

  function setGuestCookie() {
    document.cookie =
      COOKIE_NAME +
      "=1; Max-Age=" +
      COOKIE_MAX_AGE +
      "; Path=" +
      COOKIE_PATH +
      "; SameSite=Lax";
  }

  function setUnlockedState(unlocked) {
    var pinScreen = document.getElementById("pin-screen");
    var guideContent = document.getElementById("guide-content");
    if (!pinScreen || !guideContent) {
      return;
    }

    if (unlocked) {
      pinScreen.classList.add("hidden");
      guideContent.classList.remove("hidden");
      guideContent.setAttribute("aria-hidden", "false");
    } else {
      pinScreen.classList.remove("hidden");
      guideContent.classList.add("hidden");
      guideContent.setAttribute("aria-hidden", "true");
    }
  }

  function applyI18n(dict) {
    var textNodes = document.querySelectorAll("[data-i18n]");
    textNodes.forEach(function (node) {
      var key = node.getAttribute("data-i18n");
      if (dict[key]) {
        node.textContent = dict[key];
      }
    });

    var placeholderNodes = document.querySelectorAll("[data-i18n-placeholder]");
    placeholderNodes.forEach(function (node) {
      var key = node.getAttribute("data-i18n-placeholder");
      if (dict[key]) {
        node.setAttribute("placeholder", dict[key]);
      }
    });

    if (dict.title) {
      document.title = dict.title;
    }
  }

  function createList(listId, values) {
    var el = document.getElementById(listId);
    if (!el || !Array.isArray(values)) {
      return;
    }
    el.innerHTML = "";
    values.forEach(function (value) {
      var li = document.createElement("li");
      li.textContent = value;
      el.appendChild(li);
    });
  }

  function createGuideAccordion(items) {
    var wrapper = document.getElementById("guide-accordion");
    if (!wrapper || !Array.isArray(items)) {
      return;
    }
    wrapper.innerHTML = "";
    items.forEach(function (item) {
      var details = document.createElement("details");
      var summary = document.createElement("summary");
      var p = document.createElement("p");
      summary.textContent = item;
      p.textContent = "Placeholder instructions for " + item + ".";
      details.appendChild(summary);
      details.appendChild(p);
      wrapper.appendChild(details);
    });
  }

  function setActionStatus(message) {
    var status = document.getElementById("action-status");
    if (status) {
      status.textContent = message;
    }
  }

  function bindActions(dict) {
    var copyBtn = document.getElementById("copy-wifi-btn");
    var mapBtn = document.getElementById("open-map-btn");
    var callBtn = document.getElementById("call-host-btn");
    var emergencyBtn = document.getElementById("emergency-btn");

    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var wifiText = "SSID: " + WIFI_SSID + "\nPASS: " + WIFI_PASS;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard
            .writeText(wifiText)
            .then(function () {
              setActionStatus(dict.wifi_copied || "Wi-Fi copied.");
            })
            .catch(function () {
              setActionStatus(dict.wifi_copy_failed || wifiText);
            });
        } else {
          setActionStatus(wifiText);
        }
      });
    }

    if (mapBtn) {
      mapBtn.addEventListener("click", function () {
        window.open(MAP_URL, "_blank", "noopener");
      });
    }

    if (callBtn) {
      callBtn.addEventListener("click", function () {
        window.location.href = "tel:+3069XXXXXXXX";
      });
    }

    if (emergencyBtn) {
      emergencyBtn.addEventListener("click", function () {
        var emergencySection = document.getElementById("emergencies");
        if (emergencySection) {
          emergencySection.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    }
  }

  function bindPinGate(dict) {
    var form = document.getElementById("pin-form");
    var input = document.getElementById("pin-input");
    var error = document.getElementById("pin-error");
    if (!form || !input || !error) {
      return;
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      if (input.value.trim() === ACCESS_PIN) {
        setGuestCookie();
        error.textContent = "";
        setUnlockedState(true);
      } else {
        error.textContent = dict.pin_error || "Incorrect PIN.";
      }
    });
  }

  function bindLanguageSwitcher(lang) {
    var select = document.getElementById("lang-select");
    if (!select) {
      return;
    }

    select.innerHTML = "";
    SUPPORTED_LANGS.forEach(function (code) {
      var option = document.createElement("option");
      option.value = code;
      option.textContent = code.toUpperCase();
      if (code === lang) {
        option.selected = true;
      }
      select.appendChild(option);
    });

    select.addEventListener("change", function (event) {
      var nextLang = event.target.value;
      localStorage.setItem("eh_guest_lang", nextLang);
      window.location.href = "../" + nextLang + "/";
    });
  }

  function loadJson(url) {
    return fetch(url).then(function (response) {
      if (!response.ok) {
        throw new Error("Failed to load " + url);
      }
      return response.json();
    });
  }

  function init() {
    var lang = getLangFromPath();
    bindLanguageSwitcher(lang);

    Promise.all([
      loadJson("../i18n/" + lang + ".json"),
      loadJson("../content/base.en.json"),
    ])
      .then(function (result) {
        var dict = result[0];
        var content = result[1];

        applyI18n(dict);
        createList("amenities-list", content.amenities);
        createList("rules-list", content.rules);
        createGuideAccordion(content.guide);
        createList("nearby-list", content.nearby);
        createList("emergency-list", content.emergency_numbers);
        bindActions(dict);
        bindPinGate(dict);

        if (hasGuestCookie()) {
          setUnlockedState(true);
        } else {
          setUnlockedState(false);
        }
      })
      .catch(function () {
        if (hasGuestCookie()) {
          setUnlockedState(true);
        } else {
          setUnlockedState(false);
        }
      });
  }

  init();
})();
