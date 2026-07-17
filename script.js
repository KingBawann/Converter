document.addEventListener('DOMContentLoaded', () => {
    // Converter
    const usdInput = document.getElementById('usd-input');
    const iqdInput = document.getElementById('iqd-input');
    const rateText = document.getElementById('current-rate-text');
    const lastUpdatedText = document.getElementById('last-updated-text');
    
    // Rate Override
    const editRateBtn = document.getElementById('edit-rate-btn');
    const rateEditContainer = document.getElementById('rate-edit-container');
    const manualRateInput = document.getElementById('manual-rate-input');
    const saveRateBtn = document.getElementById('save-rate-btn');

    // Cashier
    const cashierPriceUsd = document.getElementById('cashier-price-usd');
    const cashierPaidUsd = document.getElementById('cashier-paid-usd');
    const cashierPaidIqd = document.getElementById('cashier-paid-iqd');
    const cashierOwesDisplay = document.getElementById('cashier-owes-display');
    const cashierChangeDisplay = document.getElementById('cashier-change-display');
    const resetCashierBtn = document.getElementById('reset-cashier-btn');
    const pillBtns = document.querySelectorAll('.pill-btn');
    const addThousandsBtn = document.getElementById('add-thousands-btn');

    let exchangeRate = 1532;

    // Utility: Formatting
    function formatNumber(num) {
        if (!num && num !== 0 && num !== '0') return '';
        const parts = num.toString().split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        return parts.join('.');
    }
    
    function parseNumber(str) {
        if (!str) return 0;
        const cleaned = str.replace(/[^0-9.]/g, '');
        return parseFloat(cleaned) || 0;
    }

    function addSymbol(str, isUSD) {
        if (!str) return '';
        return isUSD ? `$ ${str}` : `${str} IQD`;
    }

    // Rounding to nearest 250 IQD (since 250 is the smallest bill)
    function roundIQD(num) {
        return Math.round(num / 250) * 250;
    }

    // Scraper
    async function fetchRate() {
        try {
            rateText.textContent = 'Fetching live parallel rate...';
            // Call the internal Vercel Serverless Function
            const proxyUrl = '/api/rate';
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 seconds timeout
            
            const response = await fetch(proxyUrl, { signal: controller.signal });
            clearTimeout(timeoutId);
            
            if (!response.ok) throw new Error('Backend API fail');
            
            const data = await response.json();
            
            if (data.rate) {
                exchangeRate = data.rate;
            } else {
                console.warn("Could not find a valid rate. Using default.");
            }
            
            updateRateDisplay();
            triggerAllCalculations();

        } catch (error) {
            console.error('Error fetching rate:', error);
            updateRateDisplay(true);
            triggerAllCalculations();
        }
    }

    function updateRateDisplay(isFallback = false) {
        rateText.style.color = isFallback ? '#fca5a5' : '#60a5fa';
        rateText.textContent = isFallback ? `${formatNumber(exchangeRate)} IQD (Offline)` : `${formatNumber(exchangeRate)} IQD`;
        
        const lastUpdate = new Date();
        lastUpdatedText.textContent = `Last updated: ${lastUpdate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
    }

    function triggerAllCalculations() {
        if (!usdInput.value && !iqdInput.value) usdInput.value = "$ 1";
        calculateIQD();
        calculateCashier();
    }

    // Manual Rate Edit
    editRateBtn.addEventListener('click', () => {
        rateEditContainer.classList.toggle('hidden');
        if (!rateEditContainer.classList.contains('hidden')) {
            manualRateInput.value = exchangeRate;
            manualRateInput.focus();
        }
    });

    saveRateBtn.addEventListener('click', () => {
        const newRate = parseFloat(manualRateInput.value);
        if (newRate > 0) {
            exchangeRate = newRate;
            updateRateDisplay();
            triggerAllCalculations();
        }
        rateEditContainer.classList.add('hidden');
    });

    // Converter Math
    function calculateIQD() {
        if (!exchangeRate) return;
        const usdVal = parseNumber(usdInput.value);
        if (!usdVal && usdVal !== 0) { iqdInput.value = ''; return; }
        const exactIqd = usdVal * exchangeRate;
        const iqdVal = roundIQD(exactIqd);
        const formatted = iqdVal % 1 === 0 ? formatNumber(iqdVal) : formatNumber(Number(iqdVal.toFixed(2)));
        iqdInput.value = addSymbol(formatted, false);
    }

    function calculateUSD() {
        if (!exchangeRate) return;
        const iqdVal = parseNumber(iqdInput.value);
        if (!iqdVal && iqdVal !== 0) { usdInput.value = ''; return; }
        const usdVal = iqdVal / exchangeRate;
        const formatted = usdVal % 1 === 0 ? formatNumber(usdVal) : formatNumber(Number(usdVal.toFixed(2)));
        usdInput.value = addSymbol(formatted, true);
    }

    // Cashier Math
    function calculateCashier() {
        if (!exchangeRate) return;
        
        const priceUsd = parseNumber(cashierPriceUsd.value) || 0;
        const owesIqdExact = priceUsd * exchangeRate;
        const owesIqd = roundIQD(owesIqdExact);
        cashierOwesDisplay.textContent = `${formatNumber(owesIqd)} IQD`;
        
        const paidUsd = parseNumber(cashierPaidUsd.value) || 0;
        const paidIqd = parseNumber(cashierPaidIqd.value) || 0;
        
        const totalPaidInUsd = paidUsd + (paidIqd / exchangeRate);
        const changeUsd = totalPaidInUsd - priceUsd;
        const changeIqdExact = changeUsd * exchangeRate;
        const changeIqd = roundIQD(changeIqdExact);
        
        if (paidUsd > 0 || paidIqd > 0) {
            if (changeUsd >= -0.01) { 
                cashierChangeDisplay.innerHTML = `<span class="text-green">${formatNumber(Number(changeUsd.toFixed(2)))} USD</span> <span style="color:var(--text-muted);font-size:1rem;margin:0 0.5rem">OR</span> <span class="text-green">${formatNumber(changeIqd)} IQD</span>`;
            } else {
                const stillOwesUsd = Math.abs(changeUsd);
                const stillOwesIqd = Math.abs(changeIqd);
                cashierChangeDisplay.innerHTML = `<span style="font-size:1rem;color:var(--text-muted)">Still Owes:</span> <span class="text-red">${formatNumber(Number(stillOwesUsd.toFixed(2)))} USD</span> <span style="color:var(--text-muted);font-size:1rem;margin:0 0.5rem">OR</span> <span class="text-red">${formatNumber(stillOwesIqd)} IQD</span>`;
            }
        } else {
            cashierChangeDisplay.innerHTML = `0 USD <span style="color:var(--text-muted);font-size:1rem;margin:0 0.5rem">OR</span> 0 IQD`;
        }
    }

    // Input formatter for typing
    function handleInput(e, calcFunc) {
        const input = e.target;
        let cursorPosition = input.selectionStart;
        const originalLength = input.value.length;
        
        const isUSD = input.id.includes('usd');
        
        // Clean and parse
        let val = input.value.replace(/[^0-9.]/g, '');
        const parts = val.split('.');
        if (parts.length > 2) val = parts[0] + '.' + parts.slice(1).join('');
        
        let formatted = '';
        if (val) {
             const parts2 = val.split('.');
             parts2[0] = parts2[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
             formatted = parts2.join('.');
        }
        
        let finalStr = '';
        if (formatted !== '') {
            finalStr = addSymbol(formatted, isUSD);
        }
        
        input.value = finalStr;
        if (calcFunc) calcFunc();
        
        // Proper cursor management
        const newLength = input.value.length;
        const lengthDiff = newLength - originalLength;
        let newCursorPos = Math.max(0, cursorPosition + lengthDiff);

        if (finalStr !== '') {
            if (isUSD) {
                // Don't let cursor go before the "$ "
                if (newCursorPos < 2) newCursorPos = 2;
            } else {
                // Don't let cursor go inside the " IQD"
                const maxPos = finalStr.length - 4;
                if (newCursorPos > maxPos) newCursorPos = maxPos;
            }
            input.setSelectionRange(newCursorPos, newCursorPos);
        }
    }

    // Event Listeners
    usdInput.addEventListener('input', (e) => handleInput(e, calculateIQD));
    iqdInput.addEventListener('input', (e) => handleInput(e, calculateUSD));
    
    cashierPriceUsd.addEventListener('input', (e) => handleInput(e, calculateCashier));
    cashierPaidUsd.addEventListener('input', (e) => handleInput(e, calculateCashier));
    cashierPaidIqd.addEventListener('input', (e) => handleInput(e, calculateCashier));

    // Pill buttons
    pillBtns.forEach(btn => {
        if(btn.id === 'add-thousands-btn') return; // Skip the special thousands button

        btn.addEventListener('click', () => {
            const currency = btn.getAttribute('data-currency');
            const valToAdd = parseFloat(btn.getAttribute('data-val'));
            
            const inputEl = currency === 'usd' ? cashierPaidUsd : cashierPaidIqd;
            const currentVal = parseNumber(inputEl.value) || 0;
            const newVal = currentVal + valToAdd;
            
            const parts = newVal.toString().split('.');
            parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
            inputEl.value = addSymbol(parts.join('.'), currency === 'usd');
            
            calculateCashier();
            
            btn.style.transform = 'scale(0.9)';
            btn.style.background = 'rgba(255,255,255,0.2)';
            setTimeout(() => {
                btn.style.transform = '';
                btn.style.background = '';
            }, 150);
        });
    });

    // 10^3 Button Logic
    addThousandsBtn.addEventListener('click', () => {
        let currentVal = parseNumber(cashierPaidIqd.value) || 0;
        if (currentVal > 0) {
            let newVal = currentVal * 1000;
            const parts = newVal.toString().split('.');
            parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
            cashierPaidIqd.value = addSymbol(parts.join('.'), false);
            calculateCashier();
            
            addThousandsBtn.style.transform = 'scale(0.9)';
            addThousandsBtn.style.background = 'var(--primary)';
            addThousandsBtn.style.color = '#fff';
            setTimeout(() => {
                addThousandsBtn.style.transform = '';
                addThousandsBtn.style.background = 'rgba(59,130,246,0.15)';
                addThousandsBtn.style.color = '#60a5fa';
            }, 150);
        }
    });

    // Reset button
    resetCashierBtn.addEventListener('click', () => {
        cashierPriceUsd.value = '';
        cashierPaidUsd.value = '';
        cashierPaidIqd.value = '';
        calculateCashier();
        
        resetCashierBtn.textContent = '✓ Cleared';
        resetCashierBtn.style.background = 'var(--green)';
        resetCashierBtn.style.color = '#0f172a';
        setTimeout(() => {
            resetCashierBtn.textContent = 'Complete Transaction';
            resetCashierBtn.style.background = '';
            resetCashierBtn.style.color = '';
        }, 1000);
    });

    // Initial setup
    updateRateDisplay();
    fetchRate();

    // Global Minimalistic Click Ripple
    document.addEventListener('mousedown', (e) => {
        const ripple = document.createElement('div');
        ripple.className = 'click-ripple';
        ripple.style.left = `${e.clientX}px`;
        ripple.style.top = `${e.clientY}px`;
        document.body.appendChild(ripple);
        
        setTimeout(() => {
            ripple.remove();
        }, 400);
    });
});
