/* ============================================================
   PRAVĀHA-TWIN
   Simulation-Based Digital Twin
   Front-end scenario engine

   Current architecture:
   Browser → Scenario Dataset / Interpolation → Dashboard

   Electrical values are based on validated VeraGrid cases.
   This front-end does NOT claim a live VeraGrid connection.
============================================================ */


/* ============================================================
   VERIFIED / REFERENCE SCENARIO DATA
============================================================ */

const VERIFIED = {

    normal: {
        name: "Normal Demand",

        residentialLoad: 0.50,
        industrialLoad: 1.50,
        criticalLoad: 0.80,

        totalLoad: 2.80,

        grid: 2.30,
        pv: 0.50,
        battery: 0.00,

        voltages: {
            utility: 11.000,
            residential: 10.979,
            industrial: 10.956,
            critical: 10.952,
            microgrid: 10.953
        },

        status: "STABLE"
    },


    battery: {
        name: "Battery Support",

        residentialLoad: 0.50,
        industrialLoad: 1.50,
        criticalLoad: 0.80,

        totalLoad: 2.80,

        grid: 2.00,
        pv: 0.50,
        battery: 0.30,

        voltages: {
            utility: 11.000,
            residential: 10.980,
            industrial: 10.960,
            critical: 10.950,
            microgrid: 10.950
        },

        status: "STABLE"
    },


    highDemand: {
        name: "High Demand",

        residentialLoad: 0.60,
        industrialLoad: 2.35,
        criticalLoad: 0.85,

        totalLoad: 3.80,

        grid: 3.82,
        pv: 0.00,
        battery: 0.00,

        voltages: {
            utility: 11.000,
            residential: 10.970,
            industrial: 10.930,
            critical: 10.920,
            microgrid: null
        },

        status: "HIGH LOAD"
    }

};


/* ============================================================
   LOAD FORECAST
============================================================ */

const forecastData = [
    { time: "00:00", load: 2.53 },
    { time: "01:00", load: 2.66 },
    { time: "02:00", load: 2.80 },
    { time: "03:00", load: 2.98 },
    { time: "04:00", load: 3.16 },
    { time: "05:00", load: 3.34 },
    { time: "06:00", load: 3.57 },
    { time: "07:00", load: 3.80 }
];


/* ============================================================
   DOM REFERENCES
============================================================ */

const $ = (id) => document.getElementById(id);

const pageTitle = $("pageTitle");

const gridSupply = $("gridSupply");
const totalLoad = $("totalLoad");
const pvOutput = $("pvOutput");
const batteryOutput = $("batteryOutput");

const utilityVoltage = $("utilityVoltage");
const busVoltage = $("busVoltage");
const industrialVoltage = $("industrialVoltage");
const criticalVoltage = $("criticalVoltage");
const microgridVoltage = $("microgridVoltage");

const industrialSlider = $("industrialSlider");
const industrialLoadValue = $("industrialLoadValue");

const runSimulation = $("runSimulation");

const decisionTitle = $("decisionTitle");
const decisionText = $("decisionText");
const decisionStatus = $("decisionStatus");

const balanceGrid = $("balanceGrid");
const balanceBattery = $("balanceBattery");
const balanceLoad = $("balanceLoad");

const microBattery = $("microBattery");
const diagramBattery = $("diagramBattery");

const batteryButton = $("batteryButton");

const faultButton = $("faultButton");
const restoreButton = $("restoreButton");

const faultStatus = $("faultStatus");
const feederStatus = $("feederStatus");
const criticalStatus = $("criticalStatus");
const microStatus = $("microStatus");

const resetNetwork = $("resetNetwork");


/* ============================================================
   APPLICATION STATE
============================================================ */

const state = {

    industrialLoad: 1.50,

    batteryEnabled: false,

    faultActive: false,

    currentScenario: "normal"

};


/* ============================================================
   NUMBER FORMATTER
============================================================ */

function mw(value) {

    if (value === null || value === undefined) {
        return "—";
    }

    return Number(value).toFixed(2);
}


function kv(value) {

    if (value === null || value === undefined) {
        return "—";
    }

    return Number(value).toFixed(3);
}


/* ============================================================
   NAVIGATION
============================================================ */

const navItems = document.querySelectorAll(".nav-item");
const sections = document.querySelectorAll(".page-section");

const titles = {

    overview: "Digital Twin",

    forecast: "Load Forecast",

    microgrid: "Microgrid",

    resilience: "Fault & Resilience"

};


navItems.forEach((button) => {

    button.addEventListener("click", () => {

        const target = button.dataset.section;

        navItems.forEach((item) => {
            item.classList.remove("active");
        });

        button.classList.add("active");

        sections.forEach((section) => {
            section.classList.remove("active");
        });

        const targetSection = $(target);

        if (targetSection) {
            targetSection.classList.add("active");
        }

        pageTitle.textContent = titles[target] || "Digital Twin";

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

    });

});


/* ============================================================
   CLOCK
============================================================ */

function updateClock() {

    const now = new Date();

    const time = now.toLocaleTimeString(
        "en-IN",
        {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        }
    );

    $("currentTime").textContent = time;
}


updateClock();

setInterval(updateClock, 1000);


/* ============================================================
   INDUSTRIAL LOAD SLIDER
============================================================ */

industrialSlider.addEventListener("input", () => {

    const value = Number(industrialSlider.value);

    state.industrialLoad = value;

    industrialLoadValue.textContent = value.toFixed(2);

    $("simulationNote").textContent =
        "Scenario prepared • press RUN SIMULATION";

});


/* ============================================================
   SCENARIO CALCULATION
============================================================ */

/*
   The validated cases are anchor points.

   For values between tested cases, the dashboard uses a simple
   interpolation to demonstrate scenario response.

   This is intentionally NOT presented as a new VeraGrid
   calculation.
*/

function calculateScenario() {

    const industrial = state.industrialLoad;

    const residential = 0.50;
    const critical = 0.80;

    const load = residential + industrial + critical;

    /*
       Battery support scenario.
    */

    if (state.batteryEnabled) {

        const battery = 0.30;
        const pv = 0.50;

        const grid = Math.max(
            0,
            load - pv - battery
        );

        /*
           Approximate interpolation around the validated
           battery-support case.
        */

        const industrialDelta = industrial - 1.50;

        const residentialV =
            10.980 - industrialDelta * 0.004;

        const industrialV =
            10.960 - industrialDelta * 0.015;

        const criticalV =
            10.950 - industrialDelta * 0.017;

        const microV =
            10.950 - industrialDelta * 0.017;

        return {

            totalLoad: load,

            grid: grid,
            pv: pv,
            battery: battery,

            voltages: {

                utility: 11.000,

                residential: residentialV,

                industrial: industrialV,

                critical: criticalV,

                microgrid: microV

            },

            status: industrial >= 2.20
                ? "HIGH LOAD"
                : "STABLE"

        };

    }


    /*
       PV-only scenario.
    */

    const pv = 0.50;

    const grid = Math.max(
        0,
        load - pv
    );

    const industrialDelta = industrial - 1.50;

    /*
       These values are based around the validated
       1.50 MW industrial-load case.
    */

    const residentialV =
        10.979 - industrialDelta * 0.004;

    const industrialV =
        10.956 - industrialDelta * 0.016;

    const criticalV =
        10.952 - industrialDelta * 0.018;

    const microV =
        10.953 - industrialDelta * 0.018;

    return {

        totalLoad: load,

        grid: grid,
        pv: pv,
        battery: 0,

        voltages: {

            utility: 11.000,

            residential: residentialV,

            industrial: industrialV,

            critical: criticalV,

            microgrid: microV

        },

        status: industrial >= 2.20
            ? "HIGH LOAD"
            : "STABLE"

    };

}


/* ============================================================
   UPDATE DASHBOARD
============================================================ */

function updateDashboard(result) {

    gridSupply.textContent = mw(result.grid);

    totalLoad.textContent = mw(result.totalLoad);

    pvOutput.textContent = mw(result.pv);

    batteryOutput.textContent = mw(result.battery);

    utilityVoltage.textContent =
        kv(result.voltages.utility);

    busVoltage.textContent =
        kv(result.voltages.residential);

    industrialVoltage.textContent =
        kv(result.voltages.industrial);

    criticalVoltage.textContent =
        kv(result.voltages.critical);

    microgridVoltage.textContent =
        kv(result.voltages.microgrid);


    balanceGrid.textContent =
        mw(result.grid);

    balanceBattery.textContent =
        mw(result.battery);

    balanceLoad.textContent =
        mw(result.totalLoad);


    microBattery.textContent =
        mw(result.battery);

    diagramBattery.textContent =
        `${mw(result.battery)} MW`;


    /*
       Decision engine.
    */

    if (state.faultActive) {

        decisionTitle.textContent =
            "Resilience response active";

        decisionText.textContent =
            "The network is currently operating under a controlled fault scenario. Critical-load support is being evaluated through the microgrid.";

        decisionStatus.textContent =
            "RESILIENCE MODE";

        return;
    }


    if (result.status === "HIGH LOAD") {

        decisionTitle.textContent =
            "Elevated demand detected";

        decisionText.textContent =
            "Industrial demand is approaching the high-demand scenario. Downstream voltage decreases as feeder demand increases.";

        decisionStatus.textContent =
            "ATTENTION";

        return;
    }


    if (state.batteryEnabled) {

        decisionTitle.textContent =
            "Battery support enabled";

        decisionText.textContent =
            "PV and battery resources are supporting the local network, reducing upstream grid import in the simulated scenario.";

        decisionStatus.textContent =
            "DER SUPPORT";

        return;
    }


    decisionTitle.textContent =
        "Network operating normally";

    decisionText.textContent =
        "Current demand is within the validated operating scenario. Downstream voltage remains within the simulated range.";

    decisionStatus.textContent =
        "STABLE";

}


/* ============================================================
   RUN SIMULATION
============================================================ */

runSimulation.addEventListener("click", () => {

    const result = calculateScenario();

    updateDashboard(result);

    $("simulationNote").textContent =
        "Calculated from scenario model • VeraGrid-validated reference points";

    runSimulation.innerHTML =
        "<span>SIMULATION COMPLETE</span><span>✓</span>";

    setTimeout(() => {

        runSimulation.innerHTML =
            "<span>RUN SIMULATION</span><span>→</span>";

    }, 1500);

});


/* ============================================================
   RESET
============================================================ */

function resetScenario() {

    state.industrialLoad = 1.50;

    state.batteryEnabled = false;

    industrialSlider.value = "1.5";

    industrialLoadValue.textContent =
        "1.50";

    batteryButton.textContent =
        "ENABLE SUPPORT";

    batteryButton.style.color = "";

    batteryButton.style.borderColor = "";

    const result = calculateScenario();

    updateDashboard(result);

    $("simulationNote").textContent =
        "Validated normal operating scenario";

}


resetNetwork.addEventListener(
    "click",
    resetScenario
);


/* ============================================================
   BATTERY SUPPORT
============================================================ */

batteryButton.addEventListener("click", () => {

    state.batteryEnabled =
        !state.batteryEnabled;

    if (state.batteryEnabled) {

        batteryButton.textContent =
            "DISABLE SUPPORT";

        batteryButton.style.color =
            "var(--accent)";

        batteryButton.style.borderColor =
            "rgba(83,240,178,0.35)";

    } else {

        batteryButton.textContent =
            "ENABLE SUPPORT";

        batteryButton.style.color = "";

        batteryButton.style.borderColor = "";

    }

    const result = calculateScenario();

    updateDashboard(result);

});


/* ============================================================
   FAULT SIMULATION
============================================================ */

function activateFault() {

    state.faultActive = true;

    faultStatus.textContent =
        "FAULT DETECTED";

    faultStatus.classList.add("fault");

    feederStatus.textContent = "×";
    criticalStatus.textContent = "✓";
    microStatus.textContent = "⚡";

    document
        .querySelector(".fault-network .fault-node:nth-child(3)")
        .classList.add("failed");


    $("stepDetect").classList.add("active");

    $("stepIsolate").classList.add("active");

    $("stepSupport").classList.add("active");


    decisionTitle.textContent =
        "Controlled fault detected";

    decisionText.textContent =
        "An abnormal feeder condition has been injected into the simulation. The scenario isolates the affected section and evaluates microgrid support for the critical load.";

    decisionStatus.textContent =
        "RESILIENCE MODE";


    updateDashboard(calculateScenario());

}


function restoreNetwork() {

    state.faultActive = false;

    faultStatus.textContent =
        "NORMAL";

    faultStatus.classList.remove("fault");

    feederStatus.textContent = "✓";
    criticalStatus.textContent = "✓";
    microStatus.textContent = "✓";

    document
        .querySelector(".fault-network .fault-node:nth-child(3)")
        .classList.remove("failed");


    $("stepDetect").classList.remove("active");

    $("stepIsolate").classList.remove("active");

    $("stepSupport").classList.remove("active");

    $("stepRestore").classList.add("active");


    decisionTitle.textContent =
        "Network restored";

    decisionText.textContent =
        "The controlled fault scenario has been cleared and the network has returned to its normal simulated operating state.";

    decisionStatus.textContent =
        "RESTORED";


    updateDashboard(calculateScenario());

}


faultButton.addEventListener(
    "click",
    activateFault
);

restoreButton.addEventListener(
    "click",
    restoreNetwork
);


/* ============================================================
   FORECAST CHART
============================================================ */

function renderForecast() {

    const container =
        $("forecastBars");

    if (!container) {
        return;
    }

    container.innerHTML = "";

    const maximum = 4.0;

    forecastData.forEach((point) => {

        const wrapper =
            document.createElement("div");

        wrapper.className =
            "forecast-bar-wrap";


        const value =
            document.createElement("div");

        value.className =
            "forecast-value";

        value.textContent =
            `${point.load.toFixed(2)}`;


        const bar =
            document.createElement("div");

        bar.className =
            "forecast-bar";

        const height =
            Math.min(
                100,
                Math.max(
                    5,
                    (point.load / maximum) * 100
                )
            );

        bar.style.height =
            `${height}%`;


        const label =
            document.createElement("div");

        label.className =
            "forecast-label";

        label.textContent =
            point.time;


        wrapper.appendChild(value);

        wrapper.appendChild(bar);

        wrapper.appendChild(label);

        container.appendChild(wrapper);

    });

}


/* ============================================================
   INITIALIZE
============================================================ */

function initialize() {

    renderForecast();

    resetScenario();

}


/* Run application */

initialize();
