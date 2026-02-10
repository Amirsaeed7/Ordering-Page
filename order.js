document.addEventListener("DOMContentLoaded", async () => {
  // --- Service Worker registration and PWA install/update handling ---
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.register('sw.js');

      // If there's an already-waiting SW, prompt for update
      if (reg.waiting) handleSWWaiting(reg);

      reg.addEventListener('updatefound', () => {
        const newSW = reg.installing;
        newSW?.addEventListener('statechange', () => {
          if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
            handleSWWaiting(reg);
          }
        });
      });

      navigator.serviceWorker.addEventListener('controllerchange', () => {
        // page will be controlled by new SW
        console.log('controller changed — reloading');
        window.location.reload();
      });
    } catch (err) {
      console.warn('SW registration failed', err);
    }
  }

  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const btn = document.getElementById('installBtn');
    if (btn) btn.classList.remove('hidden');
  });

  const installBtn = document.getElementById('installBtn');
  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') installBtn.classList.add('hidden');
      deferredPrompt = null;
    });
  }

  function handleSWWaiting(reg) {
    const banner = document.getElementById('updateBanner');
    const btn = document.getElementById('updateReloadBtn');
    if (banner) banner.classList.remove('hidden');
    if (btn) btn.onclick = () => { reg.waiting.postMessage('SKIP_WAITING'); };
  }
  const menuContainer = document.getElementById("menuContainer");
  const submitFoodBtn = document.getElementById("submitFood");
  const submitOrderBtn = document.getElementById("submitOrder");
  const orderList = document.getElementById("orderList");
  const orderNumberEl = document.getElementById("orderNumber");

  let menuData = { ramens: [], toppings: [], others: [] };
  let currentOrder = [];
  let selectedRamen = null;

  let selectedExtras = {
    toppings: {},
    others: {},
  };

  // -------------------------
  // Order number & date
  // -------------------------
  let savedOrderNumber = parseInt(localStorage.getItem("orderNumber") || "1");
  let savedDate = localStorage.getItem("orderDate");
  const today = new Date().toISOString().split("T")[0];

  if (savedDate !== today) {
    savedOrderNumber = 1;
    localStorage.setItem("orderNumber", "1");
    localStorage.setItem("orderDate", today);
  }

  let orderNumber = savedOrderNumber;
  orderNumberEl.textContent = orderNumber;

  // -------------------------
  // Helpers
  // -------------------------
  const formatCurrency = (n) => `${n} تومان`;

  const getPrice = (arr, name) =>
    arr.find((i) => i.name === name)?.price || 0;

  // -------------------------
  // Load menu
  // -------------------------
  const res = await fetch("menuData.json");
  const data = await res.json();

  menuData.ramens = data.ramens || [];
  menuData.toppings = data.toppings || [];
  menuData.others = data.others || [];

  renderMenu();

  // -------------------------
  // Render menu
  // -------------------------
  function renderMenu() {
    menuContainer.innerHTML = "";
    selectedRamen = null;

    const section = document.createElement("div");
    section.className = "flex flex-col gap-6";

    // ===== RAMENS =====
    const ramenSection = document.createElement("div");
    ramenSection.innerHTML = `<h2 class="text-xl font-bold mb-2">رامن‌ها</h2>`;

    const ramenList = document.createElement("div");
    ramenList.className = "flex flex-wrap gap-4";

    menuData.ramens.forEach((ramen) => {
      const label = document.createElement("label");
      label.className = "item-card cursor-pointer min-w-[180px] min-h-[100px]";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.name = "ramen";

      checkbox.addEventListener("change", () => {
        document
          .querySelectorAll('input[name="ramen"]')
          .forEach((cb) => (cb.checked = cb === checkbox));

        selectedRamen = checkbox.checked ? ramen : null;
      });

      const info = document.createElement("div");
      info.className = "item-info flex-1";
      info.innerHTML = `
        <div class="item-name">${ramen.name}</div>
        <div class="item-price">${formatCurrency(ramen.price)}</div>
      `;

      label.append(checkbox, info);
      ramenList.appendChild(label);
    });

    ramenSection.appendChild(ramenList);
    section.appendChild(ramenSection);

    // ===== EXTRAS =====
    const renderExtras = (title, items, key) => {
      const wrap = document.createElement("div");
      wrap.innerHTML = `<h2 class="text-xl font-bold mb-2">${title}</h2>`;

      const list = document.createElement("div");
      list.className = "flex flex-wrap gap-4";

      items.forEach((item) => {
        const card = document.createElement("div");
        card.className = "item-card min-w-[180px]";

        const controls = document.createElement("div");
        controls.className = "item-controls";

        const plus = document.createElement("button");
        plus.textContent = "+";

        const qty = document.createElement("span");
        qty.className = "qty";
        qty.textContent = "0";

        const minus = document.createElement("button");
        minus.textContent = "−";

        const info = document.createElement("div");
        info.className = "item-info flex-1";
        info.innerHTML = `
          <div class="item-name">${item.name}</div>
          <div class="item-price">+ ${formatCurrency(item.price)}</div>
        `;

        const update = (d) => {
          const cur = selectedExtras[key][item.name] || 0;
          const next = Math.max(0, cur + d);
          if (next === 0) delete selectedExtras[key][item.name];
          else selectedExtras[key][item.name] = next;
          qty.textContent = next;
        };

        minus.onclick = () => update(-1);
        plus.onclick = () => update(1);

        // put controls in front of info (visually 'in front' of name)
        controls.append(plus, qty, minus);
        card.append(controls, info);
        list.appendChild(card);
      });

      wrap.appendChild(list);
      section.appendChild(wrap);
    };

    renderExtras("تاپینگ‌ها", menuData.toppings, "toppings");
    renderExtras("موارد دیگر", menuData.others, "others");

    menuContainer.appendChild(section);
  }

  // -------------------------
  // Add item
  // -------------------------
  submitFoodBtn.onclick = () => {
    if (!selectedRamen) {
      alert("لطفاً یک رامن انتخاب کنید.");
      return;
    }

    let extras = [];
    let extrasTotal = 0;

    ["toppings", "others"].forEach((k) => {
      Object.entries(selectedExtras[k]).forEach(([name, qty]) => {
        const price = getPrice(menuData[k], name);
        extras.push({ name, qty, price });
        extrasTotal += qty * price;
      });
    });

    currentOrder.push({
      ramen: selectedRamen.name,
      ramenPrice: selectedRamen.price,
      extras,
      itemTotal: selectedRamen.price + extrasTotal,
    });

    selectedExtras = { toppings: {}, others: {} };
    renderMenu();
    updateOrderList();
  };

  // -------------------------
  // Order list
  // -------------------------
  function updateOrderList() {
    orderList.innerHTML = "";
    let total = 0;

    currentOrder.forEach((item, itemIndex) => {
      total += item.itemTotal;

      const extrasText = item.extras
        .map((e) => `${e.name} ×${e.qty}`)
        .join("- ");

      const foodNumber = itemIndex + 1;
      const foodLabel = `غذای ${foodNumber}`;
      
      const allItems = extrasText ? `${extrasText} - ${item.ramen}` : item.ramen;

      const li = document.createElement("li");
      li.className =
        "flex justify-between items-start bg-gray-50 p-3 rounded";

      li.innerHTML = `
        <div>
          <strong>${foodLabel}</strong>
          ${
            allItems
              ? `<div class="text-xs text-gray-600">(${allItems})</div>`
              : ""
          }
        </div>
        <div class="flex gap-3 items-center">
          <span>${formatCurrency(item.itemTotal)}</span>
          <button class="text-red-600">🗑️</button>
        </div>
      `;

      li.querySelector("button").onclick = () => {
        currentOrder.splice(i, 1);
        updateOrderList();
      };

      orderList.appendChild(li);
    });

    if (currentOrder.length) {
      const totalLi = document.createElement("li");
      totalLi.className = "mt-3 border-t pt-2 font-bold";
      totalLi.textContent = `جمع کل فاکتور: ${formatCurrency(total)}`;
      orderList.appendChild(totalLi);
    }
  }

  // -------------------------
  // Submit order
  // -------------------------
  submitOrderBtn.onclick = () => {
    if (!currentOrder.length) return alert("سفارشی ثبت نشده است.");

    const orders = JSON.parse(localStorage.getItem("orders")) || [];

    orders.push({
      orderNumber,
      items: currentOrder,
      total: currentOrder.reduce((s, i) => s + i.itemTotal, 0),
      date: new Date().toLocaleString("fa-IR"),
    });

    localStorage.setItem("orders", JSON.stringify(orders));

    orderNumber++;
    localStorage.setItem("orderNumber", orderNumber);
    localStorage.setItem("orderDate", today);
    orderNumberEl.textContent = orderNumber;

    currentOrder = [];
    updateOrderList();
    alert("سفارش با موفقیت ثبت شد ✅");
  };
});
