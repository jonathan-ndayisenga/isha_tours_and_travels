function setStatus(el, { text = "", tone = "neutral" } = {}) {
  if (!el) return;
  el.textContent = text;
  el.classList.remove("text-gray-600", "text-green-700", "text-red-700");
  if (tone === "success") el.classList.add("text-green-700");
  else if (tone === "error") el.classList.add("text-red-700");
  else el.classList.add("text-gray-600");
}

function getFieldValue(form, name) {
  const el = form.elements.namedItem(name);
  if (!el) return "";
  return String(el.value ?? "").trim();
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("contact-form");
  const status = document.getElementById("contact-status");
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const payload = {
      name: getFieldValue(form, "name"),
      email: getFieldValue(form, "email"),
      phone: getFieldValue(form, "phone"),
      package: getFieldValue(form, "package"),
      travel_dates: getFieldValue(form, "travel_dates"),
      message: getFieldValue(form, "message"),
      company: getFieldValue(form, "company"),
      page: window.location.href,
    };

    if (!payload.name || !payload.email || !payload.message) {
      setStatus(status, { text: "Please fill in Name, Email, and Message.", tone: "error" });
      return;
    }

    const submitBtn = form.querySelector("button[type=\"submit\"]");
    const submitLabel = submitBtn?.querySelector("[data-submit-label]") ?? null;
    const originalLabel = submitLabel?.textContent ?? "Send";
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.setAttribute("aria-busy", "true");
      submitBtn.classList.add("opacity-60", "cursor-not-allowed");
      if (submitLabel) submitLabel.textContent = "Sending...";
    }
    setStatus(status, { text: "Sending your message...", tone: "neutral" });

    try {
      const response = await fetch(form.action, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok || !data || data.ok !== true) {
        const message = data?.error || "Message failed to send. Please try WhatsApp instead.";
        setStatus(status, { text: message, tone: "error" });
        return;
      }

      form.reset();
      setStatus(status, { text: "Sent! We'll get back to you shortly.", tone: "success" });
    } catch (error) {
      console.error(error);
      setStatus(status, { text: "Network error. Please try WhatsApp instead.", tone: "error" });
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.setAttribute("aria-busy", "false");
        submitBtn.classList.remove("opacity-60", "cursor-not-allowed");
        if (submitLabel) submitLabel.textContent = originalLabel;
      }
    }
  });
});
