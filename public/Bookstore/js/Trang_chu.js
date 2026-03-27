let slideIndex = 1;

function showSlides(n) {
  const slides = document.getElementsByClassName("myslides");

  if (!slides.length) {
    return;
  }

  if (n > slides.length) {
    slideIndex = 1;
  }

  if (n < 1) {
    slideIndex = slides.length;
  }

  for (let i = 0; i < slides.length; i += 1) {
    slides[i].style.display = "none";
  }

  slides[slideIndex - 1].style.display = "block";
}

function plusSlides(n) {
  showSlides((slideIndex += n));
}

function currentSlide(n) {
  showSlides((slideIndex = n));
}

function toggleCartDropdown() {
  const cartDropdown = document.querySelector(".cart-dropdown");
  if (!cartDropdown) {
    return;
  }

  cartDropdown.style.display =
    cartDropdown.style.display === "block" ? "none" : "block";
}

function updateCardInfoStatus() {
  const cashOption = document.getElementById("cash");
  const creditCardOption = document.getElementById("credit-card");
  const cardNumber = document.getElementById("card-number");
  const expiryDate = document.getElementById("expiry-date");
  const cvv = document.getElementById("cvv");

  if (!cashOption || !creditCardOption || !cardNumber || !expiryDate || !cvv) {
    return;
  }

  const isCreditCard = creditCardOption.checked;
  cardNumber.disabled = !isCreditCard;
  expiryDate.disabled = !isCreditCard;
  cvv.disabled = !isCreditCard;
}

function bindPaymentInputs() {
  const cashOption = document.getElementById("cash");
  const creditCardOption = document.getElementById("credit-card");

  if (!cashOption || !creditCardOption) {
    return;
  }

  cashOption.addEventListener("change", updateCardInfoStatus);
  creditCardOption.addEventListener("change", updateCardInfoStatus);
  updateCardInfoStatus();
}

function redirectToCatalog(keyword) {
  const params = new URLSearchParams();

  if (keyword) {
    params.set("keyword", keyword);
  }

  const query = params.toString();
  window.location.href = `Danh_sach_san_pham.html${query ? `?${query}` : ""}`;
}

function bindHeaderSearch() {
  const searchBar = document.querySelector(".search-bar");

  if (!searchBar) {
    return;
  }

  const input = searchBar.querySelector("input");
  const button = searchBar.querySelector("button");

  if (!input || !button) {
    return;
  }

  const submitSearch = () => redirectToCatalog(input.value.trim());

  button.addEventListener("click", submitSearch);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      submitSearch();
    }
  });
}

function bindCloseDropdownOnOutsideClick() {
  document.addEventListener("click", (event) => {
    const cartContainer = document.querySelector(".gio-hang");
    const cartDropdown = document.querySelector(".cart-dropdown");

    if (!cartContainer || !cartDropdown) {
      return;
    }

    if (!cartContainer.contains(event.target)) {
      cartDropdown.style.display = "none";
    }
  });
}

function normalizeSocialIcons() {
  const iconSources = {
    facebook: "assets/facebook.svg",
    youtube: "assets/youtube.svg",
    instagram: "assets/instagram.svg",
  };

  document.querySelectorAll(".social-icons img").forEach((icon) => {
    const alt = String(icon.alt || "").toLowerCase();

    if (alt.includes("facebook")) {
      icon.src = iconSources.facebook;
    } else if (alt.includes("youtube")) {
      icon.src = iconSources.youtube;
    } else if (alt.includes("instagram")) {
      icon.src = iconSources.instagram;
    }

    icon.loading = "lazy";
  });
}

async function updateAuthButtons() {
  const authButtons = document.querySelector(".auth-buttons");
  if (!authButtons) {
    return;
  }

  try {
    const response = await fetch("/api/auth/me", {
      credentials: "include",
      cache: "no-store",
    });

    if (!response.ok) {
      return;
    }

    const data = await response.json();

    if (!data.isAuthenticated || !data.user) {
      return;
    }

    authButtons.innerHTML = "";

    const greeting = document.createElement("span");
    greeting.textContent = `Xin chào, ${data.user.username}`;
    greeting.style.fontWeight = "bold";

    const historyButton = document.createElement("button");
    historyButton.type = "button";
    historyButton.textContent = "Đơn hàng";
    historyButton.addEventListener("click", () => {
      window.location.href = "Lich_su_don_hang.html";
    });

    authButtons.appendChild(greeting);
    authButtons.appendChild(document.createTextNode(" | "));
    authButtons.appendChild(historyButton);

    if (data.user.role === "admin") {
      const adminButton = document.createElement("button");
      adminButton.type = "button";
      adminButton.textContent = "Quản trị";
      adminButton.addEventListener("click", () => {
        window.location.href = "Quan_tri.html";
      });

      authButtons.appendChild(document.createTextNode(" "));
      authButtons.appendChild(adminButton);
    }

    const logoutButton = document.createElement("button");
    logoutButton.type = "button";
    logoutButton.textContent = "Đăng xuất";
    logoutButton.addEventListener("click", async () => {
      try {
        const logoutResponse = await fetch("/api/auth/logout", {
          method: "POST",
        });

        if (!logoutResponse.ok) {
          throw new Error("Không thể đăng xuất.");
        }

        window.location.href = "Trang_chu.html";
      } catch (error) {
        alert(error.message);
      }
    });

    authButtons.appendChild(document.createTextNode(" "));
    authButtons.appendChild(logoutButton);
  } catch (error) {
    console.error(error);
  }
}

window.plusSlides = plusSlides;
window.currentSlide = currentSlide;
window.toggleCartDropdown = toggleCartDropdown;

if (document.getElementsByClassName("myslides").length) {
  showSlides(slideIndex);
}

bindPaymentInputs();
bindHeaderSearch();
bindCloseDropdownOnOutsideClick();
normalizeSocialIcons();
updateAuthButtons();
