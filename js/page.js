import { SAMPLES, previewNumber, snippetsFor, rateLimitExample, API_BASE } from "./preview.js";

const input = document.querySelector("#number");
const form = document.querySelector("#sandbox-form");
const chips = document.querySelector("#samples");
const output = document.querySelector("#output");
const statusPill = document.querySelector("#status-pill");
const summary = document.querySelector("#summary");
const snippetHost = document.querySelector("#snippets");
const copySnippet = document.querySelector("#copy-snippet");
const endpointUrl = document.querySelector("#endpoint-url");

let activeTab = "curl";
let lastSnippet = snippetsFor(SAMPLES[0].e164);

endpointUrl.textContent = API_BASE + "/phone-reputation";
document.querySelector("#year").textContent = String(new Date().getFullYear());

SAMPLES.forEach(function (sample) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "chip";
  button.textContent = sample.e164 + " · " + sample.riskLevel;
  button.addEventListener("click", function () {
    input.value = sample.e164;
    run();
  });
  chips.appendChild(button);
});

const unknownButton = document.createElement("button");
unknownButton.type = "button";
unknownButton.className = "chip chip-quiet";
unknownButton.textContent = "Unlisted number";
unknownButton.addEventListener("click", function () {
  input.value = "+14155550110";
  run();
});
chips.appendChild(unknownButton);

form.addEventListener("submit", function (event) {
  event.preventDefault();
  run();
});

document.querySelectorAll("[data-tab]").forEach(function (button) {
  button.addEventListener("click", function () {
    activeTab = button.getAttribute("data-tab");
    paintTabs();
  });
});

copySnippet.addEventListener("click", function () {
  copyText(lastSnippet[activeTab], copySnippet);
});

document.querySelector("#copy-json").addEventListener("click", function () {
  copyText(output.textContent, document.querySelector("#copy-json"));
});

document.querySelector("#show-429").addEventListener("click", function () {
  const example = rateLimitExample();
  statusPill.textContent = "HTTP 429";
  statusPill.dataset.kind = "error";
  summary.textContent = "This is the body a client receives after the free tier’s 100 requests in a UTC day are used up. The sandbox itself is not metered.";
  output.textContent = JSON.stringify(example.body, null, 2);
});

paintTabs();
run();

function run() {
  const result = previewNumber(input.value);
  statusPill.textContent = "HTTP " + result.status;
  statusPill.dataset.kind = result.ok ? "ok" : "error";
  summary.textContent = result.summary || result.body.error.message;
  output.textContent = JSON.stringify(result.body, null, 2);
  const e164 = result.ok ? result.body.number.e164 : SAMPLES[0].e164;
  lastSnippet = snippetsFor(e164);
  paintTabs();
}

function paintTabs() {
  document.querySelectorAll("[data-tab]").forEach(function (button) {
    const on = button.getAttribute("data-tab") === activeTab;
    button.setAttribute("aria-selected", on ? "true" : "false");
  });
  snippetHost.textContent = lastSnippet[activeTab];
  copySnippet.textContent = "Copy " + labelFor(activeTab);
}

function labelFor(tab) {
  if (tab === "curl") return "curl";
  if (tab === "python") return "Python";
  return "Node.js";
}

function copyText(value, button) {
  const original = button.textContent;
  navigator.clipboard.writeText(value).then(function () {
    button.textContent = "Copied";
    setTimeout(function () {
      button.textContent = original;
    }, 1200);
  }).catch(function () {
    button.textContent = "Select and copy";
  });
}
