"use strict";

const items = document.querySelector("#items");
const template = document.querySelector("#item-template");
const addButton = document.querySelector("#add-item");
const totalOutput = document.querySelector("#total");
const moneyFormatter = new Intl.NumberFormat("ru-RU", {
  maximumFractionDigits: 2,
});

function readNumber(value) {
  const normalized = value.replace(/[\s\u00a0\u202f]/g, "").replace(",", ".");
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) return 0;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : 0;
}

function roundMoney(value) {
  const rounded = Math.round(value * 100) / 100;
  return Number.isFinite(rounded) ? rounded : 0;
}

function formatMoney(value) {
  return `${moneyFormatter.format(value === 0 ? 0 : value).replace(/[\u00a0\u202f]/g, " ")} ₸`;
}

function recalculate() {
  let total = 0;
  for (const row of items.rows) {
    const quantity = readNumber(row.querySelector(".item-quantity").value);
    const price = readNumber(row.querySelector(".item-price").value);
    const amount = roundMoney(quantity * price);
    row.querySelector(".item-total").textContent = formatMoney(amount);
    total = roundMoney(total + amount);
  }
  totalOutput.textContent = formatMoney(total);
}

function addItem(focus = true) {
  const row = template.content.firstElementChild.cloneNode(true);
  items.append(row);
  if (focus) row.querySelector(".item-name").focus();
  recalculate();
  return row;
}

addButton.addEventListener("click", () => addItem());
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
