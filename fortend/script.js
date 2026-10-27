(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const config = window.HYPERVISION_CONFIG || {};
  const storedWorkerUrl = localStorage.getItem("hv_worker_url") || config.WORKER_URL || "";
  let workerUrl = normalizeWorkerUrl(storedWorkerUrl);
  let history = [];
  let busy = false;

  function normalizeWorkerUrl(value) {
    return String(value || "").trim().replace(/\/+$/, "");
  }
  function endpoint(path) {
    if (!workerUrl) throw new Error("Worker URL is not set yet. Enter your Cloudflare Worker URL in Connection Settings.");
    return workerUrl + path;
  }
  function addMessage(role, content) {
    const box = document.createElement("div");
    box.className = "message " + (role === "user" ? "user" : "assistant");
    const label = document.createElement("span");
    label.className = "message-label";
    label.textContent = role === "user" ? "BOSS" : "HYPERVISION";
    const p = document.createElement("p");
    p.textContent = content;
    box.append(label, p);
    $("chatLog").appendChild(box);
    $("chatLog").scrollTop = $("chatLog").scrollHeight;
  }
  function setStatus(text, connected = false) {
    $("connectionStatus").textContent = text;
    $("modelStatus").textContent = connected ? "Gemini backend connected" : "Backend not connected";
  }
  function speak(text) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-IN";
    utterance.rate = 0.88;
    utterance.pitch = 1.12;
    window.speechSynthesis.speak(utterance);
  }
  async function request(path, options = {}) {
    const response = await fetch(endpoint(path), {
      ...options,
      headers: { "Content-Type": "application/json", ...(options.headers || {}) }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
    return data;
  }
  async function loadModels() {
    if (!workerUrl) { setStatus("UI READY"); return; }
    try {
      const data = await request("/api/models");
      const select = $("modelSelect");
      select.replaceChildren();
      const auto = document.createElement("option");
      auto.value = "auto"; auto.textContent = "Auto select"; select.appendChild(auto);
      (data.models || []).forEach((model) => {
        const option = document.createElement("option");
        option.value = model.name;
        option.textContent = model.displayName || model.name.replace(/^models\//, "");
        select.appendChild(option);
      });
      setStatus("API ONLINE", true);
      $("configStatus").textContent = `Connected. ${data.models?.length || 0} compatible model(s) found.`;
      $("assistantGreeting").textContent = "Hello, Boss. HyperVision is connected and ready to assist you.";
    } catch (error) {
      setStatus("API OFFLINE");
      $("configStatus").textContent = error.message;
    }
  }
  $("workerUrlInput").value = workerUrl;
  $("workerForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const raw = $("workerUrlInput").value.trim();
    if (raw && !/^https:\/\//i.test(raw)) {
      $("configStatus").textContent = "Use the HTTPS URL ending in .workers.dev or your Worker domain.";
      return;
    }
    workerUrl = normalizeWorkerUrl(raw);
    localStorage.setItem("hv_worker_url", workerUrl);
    $("configStatus").textContent = "Saved in this browser. Checking backend…";
    await loadModels();
  });
  $("chatForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (busy) return;
    const message = $("messageInput").value.trim();
    if (!message) return;
    $("messageInput").value = "";
    addMessage("user", message);
    history.push({ role: "user", parts: [{ text: message }] });
    busy = true;
    const button = document.querySelector(".send-button");
    button.disabled = true;
    try {
      const model = $("modelSelect").value;
      const data = await request("/api/chat", {
        method: "POST",
        body: JSON.stringify({ message, history: history.slice(-16, -1), model })
      });
      const answer = String(data.text || "I didn't receive a text response, Boss.");
      history.push({ role: "model", parts: [{ text: answer }] });
      addMessage("assistant", answer);
      speak(answer);
    } catch (error) {
      addMessage("assistant", `Sorry, Boss. ${error.message}`);
    } finally {
      busy = false;
      button.disabled = false;
      $("messageInput").focus();
    }
  });
  $("clearChat").addEventListener("click", () => {
    history = [];
    $("chatLog").replaceChildren();
    addMessage("assistant", "Chat cleared, Boss. What would you like to do next?");
  });
  $("micButton").addEventListener("click", () => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      $("voiceStatus").textContent = "Speech recognition is not supported by this browser. You can still type messages.";
      return;
    }
    const recognition = new Recognition();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    $("voiceStatus").textContent = "LISTENING… PLEASE SPEAK, BOSS.";
    recognition.onresult = (event) => {
      $("messageInput").value = event.results[0][0].transcript;
      $("voiceStatus").textContent = "VOICE CAPTURED";
      $("chatForm").requestSubmit();
    };
    recognition.onerror = () => { $("voiceStatus").textContent = "Microphone error. Check browser permission or type your message."; };
    recognition.onend = () => { if ($( "voiceStatus").textContent.startsWith("LISTENING")) $("voiceStatus").textContent = "VOICE READY"; };
    try { recognition.start(); } catch { $("voiceStatus").textContent = "Voice input is already active. Try again in a moment."; }
  });
  $("voiceAction").addEventListener("click", () => speak("Yes, Boss. I'm listening."));
  $("phoneAction").addEventListener("click", () => {
    addMessage("assistant", "Phone actions need a native Android companion or supported browser intents. This website cannot silently control every app or setting, Boss.");
  });
  $("studyAction").addEventListener("click", () => {
    $("messageInput").value = "Boss needs a simple study plan. Help me study one small chunk at a time.";
    $("messageInput").focus();
  });
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
  }
  loadModels();
})();
