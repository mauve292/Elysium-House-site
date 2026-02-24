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
  var GUEST_SLUG = "elysium-access-7f3a9c2e";
  var MAP_URL = "https://maps.google.com/?q=Elysium+House";
  var WIFI_SSID = "ELYSIUM_WIFI";
  var WIFI_PASS = "elysium1234";
  var DEFAULT_DICT = {
    title: "Elysium House \u2014 Guest Guide",
    subtitle: "Private page for guests (PIN required).",
    language_label: "Language",
    pin_title: "Enter PIN",
    pin_hint: "Please enter your guest PIN to access this private guide.",
    pin_placeholder: "Enter 4-digit PIN",
    pin_submit: "Unlock Guide",
    pin_error_wrong: "Incorrect PIN. Please try again.",
    pin_error_server: "Server error. Please try again.",
    loading: "Loading...",
    wifi_copied: "Wi-Fi details copied.",
    wifi_copy_failed: "Unable to copy automatically.",
  };

  function getLangFromPath() {
    var parts = window.location.pathname.split("/").filter(Boolean);
    var lang = parts[parts.length - 1];
    if (SUPPORTED_LANGS.indexOf(lang) === -1) {
      return DEFAULT_LANG;
    }
    return lang;
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
      var value;
      if (key === "pin_description" && dict.pin_hint) {
        value = dict.pin_hint;
      } else {
        value = dict[key];
      }
      if (value) {
        node.textContent = value;
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

  function setPinMessage(message) {
    var error = document.getElementById("pin-error");
    if (error) {
      error.textContent = message || "";
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

  function getSessionState() {
    return fetch("/api/guest/session", {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    })
      .then(function (response) {
        if (!response.ok) {
          return { ok: false };
        }
        return response.json();
      })
      .then(function (data) {
        return !!(data && data.ok);
      })
      .catch(function () {
        return false;
      });
  }

  function refreshSession(dict) {
    setPinMessage(dict.loading || DEFAULT_DICT.loading);
    return getSessionState().then(function (isUnlocked) {
      setPinMessage("");
      setUnlockedState(isUnlocked);
      return isUnlocked;
    });
  }

  function bindPinGate(dict) {
    var form = document.getElementById("pin-form");
    var input = document.getElementById("pin-input");
    if (!form || !input) {
      return;
    }

    form.addEventListener("submit", function (event) {
      var submitButton = form.querySelector("button[type='submit']");
      var pinValue = input.value.trim();
      event.preventDefault();
      if (!pinValue) {
        setPinMessage(dict.pin_error_wrong || DEFAULT_DICT.pin_error_wrong);
        return;
      }

      if (submitButton) {
        submitButton.disabled = true;
      }
      setPinMessage(dict.loading || DEFAULT_DICT.loading);

      fetch("/api/guest/unlock", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          slug: GUEST_SLUG,
          pin: pinValue,
        }),
      })
        .then(function (response) {
          return response
            .json()
            .catch(function () {
              return {};
            })
            .then(function (data) {
              return { response: response, data: data };
            });
        })
        .then(function (result) {
          if (result.response.ok && result.data && result.data.ok) {
            return refreshSession(dict).then(function (valid) {
              if (!valid) {
                setPinMessage(
                  dict.pin_error_server || DEFAULT_DICT.pin_error_server
                );
              } else {
                setPinMessage("");
                input.value = "";
              }
            });
          }

          if (result.response.status === 401 || result.response.status === 400) {
            setPinMessage(dict.pin_error_wrong || DEFAULT_DICT.pin_error_wrong);
            return;
          }

          setPinMessage(dict.pin_error_server || DEFAULT_DICT.pin_error_server);
        })
        .catch(function () {
          setPinMessage(dict.pin_error_server || DEFAULT_DICT.pin_error_server);
        })
        .then(function () {
          if (submitButton) {
            submitButton.disabled = false;
          }
        });
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
      try {
        localStorage.setItem("eh_guest_lang", nextLang);
      } catch (error) {}
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
    setUnlockedState(false);
    setPinMessage(DEFAULT_DICT.loading);

    Promise.all([
      loadJson("../i18n/" + lang + ".json"),
      loadJson("../content/base.en.json"),
    ])
      .then(function (result) {
        var dict = Object.assign({}, DEFAULT_DICT, result[0] || {});
        var content = result[1];

        applyI18n(dict);
        createList("amenities-list", content.amenities);
        createList("rules-list", content.rules);
        createGuideAccordion(content.guide);
        createList("nearby-list", content.nearby);
        createList("emergency-list", content.emergency_numbers);
        bindActions(dict);
        bindPinGate(dict);
        return refreshSession(dict);
      })
      .catch(function () {
        applyI18n(DEFAULT_DICT);
        bindActions(DEFAULT_DICT);
        bindPinGate(DEFAULT_DICT);
        return refreshSession(DEFAULT_DICT);
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
