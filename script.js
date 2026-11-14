"use strict";

const items = document.querySelector("#items");
const template = document.querySelector("#item-template");
const addButton = document.querySelector("#add-item");
const totalOutput = document.querySelector("#total");
const discountRate = document.querySelector("#discount-rate");
const vatRate = document.querySelector("#vat-rate");
const currency = document.querySelector("#currency");
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

function addItem(focus = true) {
  const row = template.content.firstElementChild.cloneNode(true);
  items.append(row);
  if (focus) row.querySelector(".item-name").focus();
  recalculate();
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
  if (nextRow) nextRow.querySelector(".item-name").focus();
  else addButton.focus();
});

const today = new Date();
document.querySelector("#estimate-date").value = [
  today.getFullYear(),
  String(today.getMonth() + 1).padStart(2, "0"),
  String(today.getDate()).padStart(2, "0"),
].join("-");

addItem(false);

function preparePrint() {
  recalculate();
  const number = document.querySelector('[name="estimate-number"]').value.trim() || "—";
  const date = document.querySelector("#estimate-date").value;
  const formattedDate = date ? date.split("-").reverse().join(".") : "—";
  document.querySelector("#print-title").textContent = `Смета № ${number} от ${formattedDate}`;

  // Текстовые копии переносят длинные значения и весь комментарий без обрезки.
  document.querySelectorAll("input, select, textarea").forEach((field) => {
    let value = field.nextElementSibling;
    if (!value || !value.classList.contains("print-value")) {
      value = document.createElement("span");
      value.className = "print-value";
      field.after(value);
    }
    value.textContent = field.value;
  });
}

window.addEventListener("beforeprint", preparePrint);
document.querySelector("#save-pdf").addEventListener("click", () => {
  preparePrint();
  window.print();
});
