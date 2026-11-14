"use strict";

const items = document.querySelector("#items");
const template = document.querySelector("#item-template");
const addButton = document.querySelector("#add-item");
const totalOutput = document.querySelector("#total");
const discountRate = document.querySelector("#discount-rate");
const vatRate = document.querySelector("#vat-rate");
const currency = document.querySelector("#currency");
const draftKey = "smeta-draft-v1";
const draftFields = {
  sender: document.querySelector('[name="sender"]'),
  recipient: document.querySelector('[name="recipient"]'),
  number: document.querySelector('[name="estimate-number"]'),
  date: document.querySelector("#estimate-date"),
  discount: discountRate,
  vat: vatRate,
  currency,
  comment: document.querySelector("#comment"),
};
// Описание сохраняется вместе с остальными полями позиции.
const itemFields = { name: ".item-name", description: ".item-description", quantity: ".item-quantity", unit: ".item-unit", price: ".item-price" };
let restoringDraft = true;
let copyTimer;
const moneyFormatter = new Intl.NumberFormat("ru-RU", {
  maximumFractionDigits: 0,
});

function readNumber(value) {
  const normalized = value.replace(/[\s\u00a0\u202f]/g, "").replace(",", ".");
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) return 0;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : 0;
}

function roundMoney(value) {
  const rounded = Math.round(value);
  return Number.isFinite(rounded) ? rounded : 0;
}

function formatMoney(value) {
  return `${moneyFormatter.format(value === 0 ? 0 : value).replace(/[\u00a0\u202f]/g, " ")} ${currency.value}`;
}

function recalculate() {
  document.querySelectorAll(".currency-symbol").forEach((symbol) => {
    symbol.textContent = currency.value;
  });
  let total = 0;
  for (const row of items.rows) {
    const quantity = readNumber(row.querySelector(".item-quantity").value);
    const price = readNumber(row.querySelector(".item-price").value);
    const amount = roundMoney(quantity * price);
    row.querySelector(".item-total").textContent = formatMoney(amount);
    total = roundMoney(total + amount);
  }
  const discount = roundMoney(total * (readNumber(discountRate.value) / 100));
  const discounted = roundMoney(total - discount);
  const vat = roundMoney(discounted * (readNumber(vatRate.value) / 100));

  document.querySelector("#subtotal").textContent = formatMoney(total);
  document.querySelector("#discount-amount").textContent = formatMoney(-discount);
  document.querySelector("#discounted-amount").textContent = formatMoney(discounted);
  document.querySelector("#vat-amount").textContent = formatMoney(vat);
  document.querySelector("#discount-line").hidden = discount === 0;
  document.querySelector("#discounted-line").hidden = discounted === 0;
  document.querySelector("#vat-line").hidden = vat === 0;
  totalOutput.textContent = formatMoney(roundMoney(discounted + vat));
}

function addItem(focus = true, values = null) {
  const row = template.content.firstElementChild.cloneNode(true);
  if (values) {
    for (const [key, selector] of Object.entries(itemFields)) {
      // В старых черновиках описание отсутствует — оставляем поле пустым.
      row.querySelector(selector).value = values[key] ?? "";
    }
  }
  items.append(row);
  if (focus) row.querySelector(".item-name").focus();
  recalculate();
  saveDraft();
  return row;
}

addButton.addEventListener("click", () => addItem());
discountRate.addEventListener("input", recalculate);
vatRate.addEventListener("input", recalculate);
currency.addEventListener("change", recalculate);
items.addEventListener("input", recalculate);
items.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" || event.isComposing || event.repeat) return;
  if (!event.target.matches("input")) return;
  if (event.target.closest("tr") === items.lastElementChild) {
    event.preventDefault();
    addItem();
  }
});
items.addEventListener("click", (event) => {
  const button = event.target.closest(".delete-button");
  if (!button) return;
  const row = button.closest("tr");
  const nextRow = row.nextElementSibling || row.previousElementSibling;
  row.remove();
  recalculate();
  saveDraft();
  if (nextRow) nextRow.querySelector(".item-name").focus();
  else addButton.focus();
});

const today = new Date();
document.querySelector("#estimate-date").value = [
  today.getFullYear(),
  String(today.getMonth() + 1).padStart(2, "0"),
  String(today.getDate()).padStart(2, "0"),
].join("-");

// Сохраняем прежние имена полей и ключ черновика при смене названия документа.
function estimateReference() {
  const number = document.querySelector('[name="estimate-number"]').value.trim() || "—";
  const date = document.querySelector("#estimate-date").value;
  const formattedDate = date ? date.split("-").reverse().join(".") : "—";
  return `№ ${number} от ${formattedDate}`;
}

function estimateHeading() {
  return `Коммерческое предложение ${estimateReference()}`;
}

function preparePrint() {
  recalculate();
  // В печати номер и дата идут отдельной строкой под заголовком КП.
  document.querySelector("#print-title").textContent = "Коммерческое предложение";
  document.querySelector("#print-meta").textContent = estimateReference();

  // Текстовые копии переносят длинные значения и весь комментарий без обрезки.
  document.querySelectorAll("input, select, textarea").forEach((field) => {
    let value = field.nextElementSibling;
    if (!value || !value.classList.contains("print-value")) {
      value = document.createElement("span");
      value.className = "print-value";
      field.after(value);
    }
    // Пустое описание не занимает места в печатной версии и PDF.
    value.textContent = field.matches(".item-description") ? field.value.trim() : field.value;
  });
}

window.addEventListener("beforeprint", preparePrint);
document.querySelector("#save-pdf").addEventListener("click", () => {
  preparePrint();
  window.print();
});

function storageMessage(message) {
  const status = document.querySelector("#storage-status");
  status.textContent = message;
  status.hidden = !message;
}

function saveDraft() {
  if (restoringDraft) return;
  const fields = Object.fromEntries(Object.entries(draftFields).map(([key, field]) => [key, field.value]));
  const positions = Array.from(items.rows, (row) => Object.fromEntries(
    Object.entries(itemFields).map(([key, selector]) => [key, row.querySelector(selector).value]),
  ));
  try {
    localStorage.setItem(draftKey, JSON.stringify({ version: 1, fields, positions }));
    storageMessage("");
  } catch {
    storageMessage("Не удалось сохранить черновик в браузере. До закрытия страницы сохраните PDF или скопируйте КП.");
  }
}

function restoreDraft() {
  try {
    const saved = localStorage.getItem(draftKey);
    if (saved === null) return false;
    const draft = JSON.parse(saved);
    const valid = draft?.version === 1 && draft.fields &&
      Object.keys(draftFields).every((key) => typeof draft.fields[key] === "string") &&
      ["₸", "₽", "$", "€"].includes(draft.fields.currency) &&
      Array.isArray(draft.positions) && draft.positions.every((position) =>
        // Сохраняем совместимость с черновиками без необязательного описания.
        position && Object.keys(itemFields).every((key) =>
          (key === "description" && position[key] === undefined) || typeof position[key] === "string") &&
        ["шт", "час", "услуга"].includes(position.unit));
    if (!valid) throw new Error("Invalid draft");
    for (const [key, field] of Object.entries(draftFields)) field.value = draft.fields[key];
    draft.positions.forEach((position) => addItem(false, position));
    recalculate();
    return true;
  } catch {
    storageMessage("Не удалось восстановить черновик. Проверьте, разрешено ли браузеру локальное хранение данных.");
    return false;
  }
}

function clearCopyFeedback() {
  clearTimeout(copyTimer);
  document.querySelector("#copy-status").textContent = "";
  document.querySelector("#manual-copy").hidden = true;
  document.querySelector("#share-text").value = "";
}

document.querySelector(".estimate").addEventListener("input", (event) => {
  if (!event.target.matches("input, select, textarea") || event.target.id === "share-text") return;
  clearCopyFeedback();
  saveDraft();
});
document.querySelector(".estimate").addEventListener("change", (event) => {
  if (!event.target.matches("input, select, textarea") || event.target.id === "share-text") return;
  clearCopyFeedback();
  saveDraft();
});

document.querySelector("#new-estimate").addEventListener("click", () => {
  if (!window.confirm("Создать новое КП? Текущий черновик будет очищен.")) return;
  const current = draftFields.number.value.trim();
  const match = current.match(/^(.*?)(\d+)$/);
  const nextNumber = match
    ? match[1] + (BigInt(match[2]) + 1n).toString().padStart(match[2].length, "0")
    : "1";
  restoringDraft = true;
  for (const field of Object.values(draftFields)) field.value = "";
  draftFields.number.value = nextNumber;
  const now = new Date();
  draftFields.date.value = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("-");
  discountRate.value = "0";
  vatRate.value = "0";
  currency.value = "₸";
  items.replaceChildren();
  clearCopyFeedback();
  addItem();
  restoringDraft = false;
  saveDraft();
});

function shareText() {
  recalculate();
  const lines = [estimateHeading()];
  if (draftFields.sender.value.trim()) lines.push(`Исполнитель: ${draftFields.sender.value.trim()}`);
  if (draftFields.recipient.value.trim()) lines.push(`Клиент: ${draftFields.recipient.value.trim()}`);
  lines.push("");
  for (const row of items.rows) {
    const name = row.querySelector(".item-name").value.trim() || "Без наименования";
    const quantity = readNumber(row.querySelector(".item-quantity").value)
      .toLocaleString("ru-RU", { maximumFractionDigits: 20 }).replace(/[\u00a0\u202f]/g, " ");
    const unit = row.querySelector(".item-unit").value;
    const price = formatMoney(readNumber(row.querySelector(".item-price").value));
    const amount = row.querySelector(".item-total").textContent;
    lines.push(`• ${name} — ${quantity} ${unit} × ${price} = ${amount}`);
    // В WhatsApp описание идёт под своей позицией, только если оно заполнено.
    const description = row.querySelector(".item-description").value.trim();
    if (description) lines.push(...description.split(/\r?\n/).map((line) => `  ${line}`));
  }
  lines.push("", `Сумма: ${document.querySelector("#subtotal").textContent}`);
  if (!document.querySelector("#discount-line").hidden) {
    lines.push(`Скидка (${discountRate.value.trim()} %): ${document.querySelector("#discount-amount").textContent}`);
    lines.push(`Сумма со скидкой: ${document.querySelector("#discounted-amount").textContent}`);
  }
  if (!document.querySelector("#vat-line").hidden) {
    lines.push(`НДС (${vatRate.value.trim()} %): ${document.querySelector("#vat-amount").textContent}`);
  }
  lines.push(`Итого к оплате: ${totalOutput.textContent}`);
  if (draftFields.comment.value.trim()) lines.push("", draftFields.comment.value.trim());
  // Берём то же примечание, которое видно в интерфейсе и печатном документе.
  lines.push("", document.querySelector("#pricing-note").textContent.trim());
  return lines.join("\n");
}

document.querySelector("#copy-whatsapp").addEventListener("click", async () => {
  clearCopyFeedback();
  const text = shareText();
  const button = document.querySelector("#copy-whatsapp");
  button.disabled = true;
  try {
    await navigator.clipboard.writeText(text);
    document.querySelector("#copy-status").textContent = "Скопировано ✓";
    copyTimer = setTimeout(() => {
      document.querySelector("#copy-status").textContent = "";
    }, 2000);
  } catch {
    document.querySelector("#manual-copy").hidden = false;
    const field = document.querySelector("#share-text");
    field.value = text;
    field.focus();
    field.select();
  } finally {
    button.disabled = false;
  }
});

if (!restoreDraft()) addItem(false);
restoringDraft = false;

// Базовые цены каталога указаны в тенге; единица каждой услуги — «услуга».
const services = [
  {
    id: "landing-page",
    name: "Одностраничный сайт",
    description: "Сайт-визитка, портфолио или презентация продукта и услуг",
    basePrice: 50000,
    unit: "услуга",
  },
  {
    id: "multi-page-site",
    name: "Многостраничный сайт",
    description: "Разделы, услуги и вся информация о вашей компании в одном месте",
    basePrice: 150000,
    unit: "услуга",
  },
  {
    id: "online-store",
    name: "Интернет-магазин",
    description: "Каталог товаров с корзиной и удобным оформлением заказа",
    basePrice: 250000,
    unit: "услуга",
  },
  {
    id: "site-promotion",
    name: "Продвижение сайта",
    description: "Контекстная реклама в Google для привлечения вашей аудитории",
    basePrice: 80000,
    unit: "услуга",
  },
];

// Добавляем услугу отдельно, заполняя только единственную пустую стартовую строку.
function addCatalogService(service) {
  // Подставляем описание из каталога; дальше его можно менять вручную.
  const values = { name: service.name, description: service.description, quantity: "1", unit: service.unit, price: String(service.basePrice) };
  const firstRow = items.rows[0];
  const emptyStart = items.rows.length === 1 &&
    [".item-name", ".item-description", ".item-quantity", ".item-price"].every((selector) =>
      firstRow.querySelector(selector).value.trim() === "") &&
    firstRow.querySelector(".item-unit").value === "шт";

  clearCopyFeedback();
  if (emptyStart) {
    for (const [key, selector] of Object.entries(itemFields)) {
      firstRow.querySelector(selector).value = values[key];
    }
    recalculate();
    saveDraft();
    firstRow.querySelector(".item-name").focus();
  } else {
    addItem(true, values);
  }
}

// Отображаем карточки каталога с кнопками добавления в КП.
function renderCatalog() {
  const list = document.querySelector("#service-list");
  list.replaceChildren();
  for (const service of services) {
    const card = document.createElement("li");
    card.className = "catalog-service";
    const title = document.createElement("h3");
    title.textContent = service.name;
    const description = document.createElement("p");
    description.className = "catalog-description";
    description.textContent = service.description;
    const price = document.createElement("p");
    price.className = "catalog-price";
    price.textContent = `от ${moneyFormatter.format(service.basePrice).replace(/[\u00a0\u202f]/g, " ")} ₸`;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "secondary-button catalog-add";
    button.textContent = "Добавить в КП";
    button.setAttribute("aria-label", `Добавить в КП: ${service.name}`);
    button.addEventListener("click", () => addCatalogService(service));
    card.append(title, description, price, button);
    list.append(card);
  }
}

renderCatalog();
