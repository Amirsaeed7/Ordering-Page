// js/pastOrders.js
document.addEventListener("DOMContentLoaded", () => {
  const pastOrdersContainer = document.getElementById("pastOrdersContainer");
  const noOrdersMsg = document.getElementById("noOrders");

  const rawOrders = JSON.parse(localStorage.getItem("orders")) || [];

  // helper currency formatter (you can adapt to Persian digits if you want)
  function formatCurrency(n) {
    return `${n} تومان`;
  }

  // load menu data and/or persisted price map
  async function loadPriceMaps() {
    const priceMap = { foods: {}, toppings: {} };

    // try persisted prices first (so prices don't change)
    try {
      const persistedRaw = localStorage.getItem("menuPrices_v1");
      if (persistedRaw) {
        const parsed = JSON.parse(persistedRaw);
        if (parsed.foods) priceMap.foods = { ...parsed.foods };
        if (parsed.toppings) priceMap.toppings = { ...parsed.toppings };
      }
    } catch (e) {
      // ignore
    }

    // try to fetch menuData.json to fill missing prices or names
    try {
      const res = await fetch("menuData.json");
      if (res.ok) {
        const menuData = await res.json();
        if (Array.isArray(menuData.foods)) {
          menuData.foods.forEach((f) => {
            const name = f.name;
            const price = (typeof f.price === "number") ? f.price : priceMap.foods[name];
            if (price != null) priceMap.foods[name] = price;
          });
        }
        if (Array.isArray(menuData.toppings)) {
          menuData.toppings.forEach((t) => {
            if (typeof t === "object" && t.name) {
              const name = t.name;
              const price = (typeof t.price === "number") ? t.price : priceMap.toppings[name];
              if (price != null) priceMap.toppings[name] = price;
            } else {
              const name = String(t);
              if (priceMap.toppings[name] == null) {
                // leave undefined for now
              }
            }
          });
        }
      }
    } catch (e) {
      // fetch failure — it's OK if we still have persisted prices
    }

    return priceMap;
  }

  function safeNumber(v) {
    return typeof v === "number" && !Number.isNaN(v) ? v : 0;
  }

  (async function main() {
    const orders = rawOrders.slice(); // local mutable copy
    if (!orders || orders.length === 0) {
      if (noOrdersMsg) noOrdersMsg.classList.remove("hidden");
      return;
    }
    if (noOrdersMsg) noOrdersMsg.classList.add("hidden");

    const priceMap = await loadPriceMaps();

    // render each order
    orders.forEach((order, orderIndex) => {
      const card = document.createElement("div");
      card.className = "bg-white rounded-lg shadow-md p-4 flex flex-col justify-between mb-4";

      // Header
      const header = document.createElement("div");
      header.className = "flex items-center justify-between mb-3";

      const title = document.createElement("h2");
      title.className = "text-xl font-bold text-blue-700";
      title.textContent = `سفارش شماره ${order.orderNumber ?? orderIndex + 1}`;

      const date = document.createElement("span");
      date.className = "text-sm text-gray-500";
      date.textContent = order.date ?? "";

      header.appendChild(title);
      header.appendChild(date);
      card.appendChild(header);

      // Items list
      const list = document.createElement("ul");
      list.className = "list-disc pr-6 space-y-2 text-gray-800";

      let totalCost = 0;

      (order.items || []).forEach((item) => {
        // item could be:
        // { food: "...", foodPrice, toppings: ["..."] , itemTotal }
        // OR previous formats like { food: "...", price: 140, toppings: [{name,price}, ...] }
        // We'll normalize:

        // food name
        const foodName = item.food ?? item.name ?? "نامشخص";

        // food price fallback: item.foodPrice -> item.price -> priceMap.foods[name] -> 0
        const foodPrice =
          safeNumber(item.foodPrice) ||
          safeNumber(item.price) ||
          safeNumber(priceMap.foods[foodName]) ||
          0;

        // toppings normalization: array of objects {name, price}
        let toppingsArr = [];
        if (Array.isArray(item.toppings)) {
          if (item.toppings.length > 0 && typeof item.toppings[0] === "string") {
            // strings, map to {name, price}
            toppingsArr = item.toppings.map((tName) => {
              const price = safeNumber(priceMap.toppings[tName]) || 0;
              return { name: tName, price };
            });
          } else {
            // assume objects, but ensure shape
            toppingsArr = item.toppings.map((t) => {
              if (typeof t === "object" && t !== null) {
                return { name: t.name ?? String(t), price: safeNumber(t.price) || safeNumber(priceMap.toppings[t.name]) || 0 };
              } else {
                const name = String(t);
                return { name, price: safeNumber(priceMap.toppings[name]) || 0 };
              }
            });
          }
        }

        // item total: prefer item.itemTotal or item.total, else compute
        const itemTotal =
          safeNumber(item.itemTotal) ||
          safeNumber(item.total) ||
          (foodPrice + toppingsArr.reduce((s, tt) => s + safeNumber(tt.price), 0));

        totalCost += itemTotal;

        const li = document.createElement("li");
        const toppingsHtml =
          toppingsArr && toppingsArr.length
            ? `<div class="text-gray-600 text-sm">تاپینگ‌ها: ${toppingsArr
                .map((t) => `${t.name} (${formatCurrency(t.price)})`)
                .join(", ")}</div>`
            : "";

        li.innerHTML = `<div class="flex justify-between items-start gap-3">
                          <div>
                            <strong>${foodName}</strong>
                            ${toppingsHtml}
                          </div>
                          <div class="text-sm text-gray-700">${formatCurrency(itemTotal)}</div>
                        </div>`;
        list.appendChild(li);
      });

      card.appendChild(list);

      // Footer with total and delete button
      const footer = document.createElement("div");
      footer.className = "flex items-center justify-between mt-4 border-t pt-2";

      const totalEl = document.createElement("div");
      totalEl.className = "font-bold text-green-700";
      totalEl.textContent = `مجموع سفارش: ${formatCurrency(totalCost)}`;

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "text-red-600 hover:text-red-800 text-sm font-medium";
      deleteBtn.textContent = "🗑️ حذف سفارش";
      deleteBtn.addEventListener("click", () => {
        if (confirm("آیا از حذف این سفارش مطمئن هستید؟")) {
          // remove from stored orders
          const stored = JSON.parse(localStorage.getItem("orders")) || [];
          stored.splice(orderIndex, 1);
          localStorage.setItem("orders", JSON.stringify(stored));
          // remove node
          card.remove();
          // if nothing left show message
          const remaining = stored.length;
          if (remaining === 0 && noOrdersMsg) noOrdersMsg.classList.remove("hidden");
        }
      });

      footer.appendChild(totalEl);
      footer.appendChild(deleteBtn);
      card.appendChild(footer);

      pastOrdersContainer.appendChild(card);
    });
  })();
});
