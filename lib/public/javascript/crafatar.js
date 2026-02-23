var valid_user_id = /^[0-9a-f-A-F-]{32,36}$/; // uuid

fetch('https://mc-heads.net/json/mc_status').then(r => r.json()).then(data => {
  var textures_err = data.report.skins.status !== "up";
  var session_err = data.report.session.status !== "up";

  if (textures_err || session_err) {
    var warn = document.createElement("div");
    warn.setAttribute("class", "alert alert-warning");
    warn.setAttribute("role", "alert");
    warn.innerHTML = "<h5>Mojang issues</h5> Mojang's servers are having trouble <i>right now</i>, this may affect requests at Crafatar. <small><a href=\"https://mc-heads.net/mcstatus\" target=\"_blank\">check status</a>";
    document.querySelector("#alerts").appendChild(warn);
  }
});

document.addEventListener("DOMContentLoaded", function(event) {
  var avatars = document.querySelector("#avatar-wrapper");
  var backToTop = document.querySelector("#back-to-top");
  var backToTopThreshold = 420;

  // shuffle avatars
  for (var i = 0; i < avatars.children.length; i++) {
    avatars.appendChild(avatars.children[Math.random() * i | 0]);
  }

  if (backToTop) {
    var updateBackToTop = function() {
      if (window.scrollY > backToTopThreshold) {
        backToTop.classList.add("is-visible");
      } else {
        backToTop.classList.remove("is-visible");
      }
    };

    backToTop.addEventListener("click", function() {
      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });
    });

    window.addEventListener("scroll", updateBackToTop, { passive: true });
    updateBackToTop();
  }

  var tryit = document.querySelector("#tryit");
  var tryname = document.querySelector("#tryname");
  var images = document.querySelectorAll(".tryit");
  tryit.onsubmit = function(e) {
    e.preventDefault();
    tryname.value = tryname.value.trim();
    var value = tryname.value || "853c80ef3c3749fdaa49938b674adae6";
    if (!valid_user_id.test(value)) {
      tryname.value = "";
      return;
    }
    for (var j = 0; j < images.length; j++) {
      images[j].src = images[j].dataset.src.replace("$", value);
    }
  };
});