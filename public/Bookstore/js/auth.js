function setAuthMessage(message, isError = false) {
  const messageElement = document.getElementById("auth-message");

  if (!messageElement) {
    if (message) {
      alert(message);
    }
    return;
  }

  messageElement.textContent = message;
  messageElement.style.color = isError ? "#a80000" : "#1d6b3d";
}

async function submitAuthRequest(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({
    message: "Không thể xử lý phản hồi từ máy chủ.",
  }));

  if (!response.ok) {
    throw new Error(data.message || "Yêu cầu không thành công.");
  }

  return data;
}

function bindLoginForm() {
  const form = document.getElementById("login-form");

  if (!form) {
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setAuthMessage("Đang đăng nhập...");

    const formData = new FormData(form);
    const payload = {
      username: formData.get("username"),
      password: formData.get("password"),
    };

    try {
      const result = await submitAuthRequest("/api/auth/login", payload);
      setAuthMessage(result.message || "Đăng nhập thành công.");
      window.location.href =
        result.user?.role === "admin" ? "Quan_tri.html" : "Trang_chu.html";
    } catch (error) {
      setAuthMessage(error.message, true);
    }
  });
}

function bindRegisterForm() {
  const form = document.getElementById("register-form");

  if (!form) {
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setAuthMessage("Đang tạo tài khoản...");

    const formData = new FormData(form);
    const payload = {
      username: formData.get("username"),
      email: formData.get("email"),
      password: formData.get("password"),
      confirmPassword: formData.get("confirmPassword"),
    };

    try {
      const result = await submitAuthRequest("/api/auth/register", payload);
      setAuthMessage(result.message || "Đăng ký thành công.");
      window.location.href = "Trang_chu.html";
    } catch (error) {
      setAuthMessage(error.message, true);
    }
  });
}

bindLoginForm();
bindRegisterForm();
