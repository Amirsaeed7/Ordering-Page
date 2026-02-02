document.addEventListener("DOMContentLoaded", () => {
  const pastOrdersContainer = document.getElementById("pastOrdersContainer");
  const noOrdersMsg = document.getElementById("noOrders");

  const rawOrders = JSON.parse(localStorage.getItem("orders")) || [];

  // -------------------------
  // Helpers
  // -------------------------
  const formatCurrency = (n) =>
    `<span class="whitespace-nowrap">${n}&nbsp;تومان</span>`;

  const safeNumber = (v) => (typeof v === "number" && !Number.isNaN(v) ? v : 0);

  const fingilishMap = {
    "رامن گوشت": "Ramen Goosht",
    "رامن مرغ": "Ramen Morgh",
    "رامن تند": "Ramen Tond",
    "بیفتک گوشت": "Biftak Goosht",
    "بیفتک مرغ": "Biftak Morgh",
    سوسیس: "Sosis",
    "تخم مرغ": "Tokhm Morgh",
    چاپستیک: "Chopstick",
  };

  function toFingilish(text) {
    return fingilishMap[text] || text;
  }

  // -------------------------
  // Main
  // -------------------------
  // Register service worker (optional: helps PWA work on this page too)
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch((err) =>
      console.warn('SW reg failed on pastOrders', err)
    );
  }
  if (!rawOrders.length) {
    if (noOrdersMsg) noOrdersMsg.classList.remove("hidden");
    return;
  }

  if (noOrdersMsg) noOrdersMsg.classList.add("hidden");

  rawOrders.forEach((order, orderIndex) => {
    const card = document.createElement("div");
    card.className =
      "bg-white rounded-lg shadow-md p-4 flex flex-col justify-between mb-4";

    // ===== Header =====
    const header = document.createElement("div");
    header.className = "flex items-center justify-between mb-3";

    const title = document.createElement("h2");
    title.className = "text-xl font-bold text-blue-700";
    title.textContent = `سفارش شماره ${order.orderNumber ?? orderIndex + 1}`;

    const date = document.createElement("span");
    date.className = "text-sm text-gray-500";
    date.textContent = order.date ?? "";

    header.append(title, date);
    card.appendChild(header);

    // ===== Items =====
    const list = document.createElement("ul");
    list.className = "space-y-2 text-gray-800";

    let totalCost = 0;

    (order.items || []).forEach((item) => {
      // ---- Normalize base food ----
      const foodName = item.ramen || item.food || item.name || "نامشخص";

      const foodPrice =
        safeNumber(item.ramenPrice) ||
        safeNumber(item.foodPrice) ||
        safeNumber(item.price) ||
        0;

      // ---- Normalize extras ----
      let extrasArr = [];

      // New format: extras: [{name, qty, price}]
      if (Array.isArray(item.extras)) {
        extrasArr = item.extras.map((e) => ({
          name: e.name,
          qty: safeNumber(e.qty) || 1,
          price: safeNumber(e.price),
        }));
      }

      // Old format: toppings: ["...", "..."]
      else if (Array.isArray(item.toppings)) {
        extrasArr = item.toppings.map((name) => ({
          name,
          qty: 1,
          price: 0,
        }));
      }

      const extrasTotal = extrasArr.reduce((s, e) => s + e.qty * e.price, 0);

      const itemTotal = safeNumber(item.itemTotal) || foodPrice + extrasTotal;

      totalCost += itemTotal;

      // ---- Render item ----
      const li = document.createElement("li");
      li.className =
        "flex justify-between items-start gap-3 bg-gray-50 p-3 rounded";

      const extrasText = extrasArr.length
        ? `<div class="text-xs text-gray-600 mt-1">
            (${extrasArr
              .map(
                (e) =>
                  `${e.name} ×${e.qty}${
                    e.price ? ` (${formatCurrency(e.price * e.qty)})` : ""
                  }`,
              )
              .join(", ")})
           </div>`
        : "";

      li.innerHTML = `
        <div class="flex-1 text-right">
          <strong>${foodName}</strong>
          ${extrasText}
        </div>
        <div class="text-sm text-gray-700 min-w-[90px] text-left">
          ${formatCurrency(itemTotal)}
        </div>
      `;

      list.appendChild(li);
    });

    card.appendChild(list);

    // ===== Footer =====
    const footer = document.createElement("div");
    footer.className =
      "flex flex-col items-center justify-between mt-4 border-t pt-2 gap-2";

    const totalEl = document.createElement("div");
    totalEl.className = "font-bold text-green-700";
    totalEl.innerHTML = `مجموع سفارش: ${formatCurrency(totalCost)}`;

    const deleteBtn = document.createElement("button");
    deleteBtn.className =
      "text-white hover:bg-red-300 text-sm font-medium bg-red-600 p-3 rounded-lg";
    deleteBtn.textContent = "🗑️ حذف سفارش";

    deleteBtn.onclick = () => {
      if (!confirm("آیا از حذف این سفارش مطمئن هستید؟")) return;

      const stored = JSON.parse(localStorage.getItem("orders")) || [];
      stored.splice(orderIndex, 1);
      localStorage.setItem("orders", JSON.stringify(stored));

      card.remove();
      if (!stored.length && noOrdersMsg) noOrdersMsg.classList.remove("hidden");
    };

    const printBtn = document.createElement("button");
    printBtn.className =
      "text-white bg-blue-600 hover:bg-blue-400 text-sm font-medium p-3 rounded-lg";
    printBtn.textContent = "🖨️ پرینت سفارش";

    printBtn.onclick = () => openPrintModal(order);

    footer.append(totalEl, printBtn, deleteBtn);

    card.appendChild(footer);

    pastOrdersContainer.appendChild(card);

    function openPrintModal(order) {
      let margin = 20;

      // Modal backdrop
      const backdrop = document.createElement("div");
      backdrop.className = "fixed inset-0 bg-black/50 z-50 flex items-center justify-center";

      // Modal container
      const modal = document.createElement("div");
      modal.className = "bg-white rounded-lg shadow-2xl z-51 flex flex-col max-h-[90vh] w-[90%] max-w-2xl";

      // Header
      const header = document.createElement("div");
      header.className = "flex justify-between items-center p-4 border-b";
      header.innerHTML = `
        <h2 class="text-xl font-bold">Order #${order.orderNumber}</h2>
        <button id="closeModal" class="text-gray-500 hover:text-gray-700 text-xl">✖</button>
      `;

      // Controls
      const controls = document.createElement("div");
      controls.className = "flex justify-between items-center p-4 border-b bg-gray-50";
      controls.innerHTML = `
        <div class="flex gap-2">
          <button id="marginMinus" class="px-3 py-2 border rounded bg-white hover:bg-gray-100">➖ Margin (${margin}mm)</button>
          <button id="marginPlus" class="px-3 py-2 border rounded bg-white hover:bg-gray-100">➕ Margin (${margin}mm)</button>
        </div>
        <button id="printNow" class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">🖨️ Print</button>
      `;

      // Paper preview container
      const previewContainer = document.createElement("div");
      previewContainer.className = "flex-1 overflow-auto bg-gray-200 p-4 flex items-start justify-center";

      // Paper preview (A4-like size)
      const paperPreview = document.createElement("div");
      paperPreview.className = "bg-white shadow-lg w-full max-w-[210mm] min-h-[297mm] box-border print-preview";
      paperPreview.id = "paperPreview";

      // Paper content
      const paperContent = document.createElement("div");
      paperContent.className = "h-full box-border";
      paperContent.style.direction = "rtl";
      paperContent.innerHTML = `
        <h3 class="text-lg font-bold mb-4 text-center border-b pb-2">Order #${order.orderNumber}</h3>
        <ul class="space-y-3">
          ${order.items
            .map((item) => {
              const extras = item.extras?.length
                ? `<div class="text-xs text-gray-500 mt-1 text-right">${item.extras
                    .map((e) => `${toFingilish(e.name)} ×${e.qty}`)
                    .join("<br>")}</div>`
                : "";

              return `
                <li class="border-b pb-2">
                  <div class="flex justify-between items-start">
                    <div class="text-sm font-medium">${item.itemTotal} T</div>
                    <div>
                      <div class="font-semibold text-sm">${toFingilish(item.ramen)}</div>
                      ${extras}
                    </div>
                  </div>
                </li>
              `;
            })
            .join("")}
        </ul>
        <div class="mt-4 pt-3 flex justify-between items-center font-bold text-sm">
          <span>${order.total} T</span>
          <span>:Total</span>
        </div>
      `;

      paperPreview.appendChild(paperContent);
      previewContainer.appendChild(paperPreview);

      // Assemble modal
      modal.appendChild(header);
      modal.appendChild(controls);
      modal.appendChild(previewContainer);
      backdrop.appendChild(modal);
      document.body.appendChild(backdrop);

      // Update margin display and preview
      function applyMargin() {
        paperPreview.style.padding = `${margin}mm`;
        document.getElementById("marginPlus").textContent = `➕ Margin (${margin}mm)`;
        document.getElementById("marginMinus").textContent = `➖ Margin (${margin}mm)`;
      }

      applyMargin();

      // Event listeners
      header.querySelector("#closeModal").onclick = () => backdrop.remove();

      controls.querySelector("#printNow").onclick = () => {
        // Hide preview container background and reset for print
        previewContainer.style.backgroundColor = "white";
        previewContainer.style.padding = "0";
        previewContainer.style.display = "flex";
        modal.style.boxShadow = "none";
        modal.style.borderRadius = "0";
        
        window.print();
        
        // Restore after print dialog closes
        setTimeout(() => {
          previewContainer.style.backgroundColor = "#e5e7eb";
          previewContainer.style.padding = "1rem";
        }, 100);
      };

      controls.querySelector("#marginPlus").onclick = () => {
        margin += 5;
        applyMargin();
      };

      controls.querySelector("#marginMinus").onclick = () => {
        margin = Math.max(5, margin - 5);
        applyMargin();
      };
    }
  });
});
