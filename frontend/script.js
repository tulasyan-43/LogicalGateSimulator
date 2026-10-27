const pages = document.querySelectorAll(".page");
const navigationButtons = document.querySelectorAll(".nav-button");
const openButtons = document.querySelectorAll("[data-open]");
const breadcrumb = document.querySelector(".breadcrumb");
const pageTitle = document.querySelector(".topbar h1");

const pageTitles = {
  dashboard: "Logical Gate Simulator",
  gates: "Logic Gate Simulator",
  "truth-table": "Truth Table Generator",
  evaluator: "Boolean Expression Evaluator",
  simplifier: "Boolean Expression Simplifier",
  equivalence: "Expression Equivalence Checker",
  laws: "Boolean Algebra Laws",
  history: "Calculation History"
};

function showPage(pageId) {
  const selectedPage = document.getElementById(pageId);

  if (!selectedPage) {
    return;
  }

  pages.forEach((page) => {
    page.hidden = page.id !== pageId;
  });

  navigationButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.page === pageId);
  });

  pageTitle.textContent = pageTitles[pageId] || "LogicLab";
  breadcrumb.textContent = `WORKSPACE / ${(pageTitles[pageId] || pageId).toUpperCase()}`;

  window.scrollTo({ top: 0, behavior: "smooth" });
}

navigationButtons.forEach((button) => {
  button.addEventListener("click", () => {
    showPage(button.dataset.page);
  });
});

openButtons.forEach((button) => {
  button.addEventListener("click", () => {
    showPage(button.dataset.open);
  });
});

const gateButtons = document.querySelectorAll(".gate-option");
const selectedGateTitle = document.getElementById("selectedGateTitle");
const gateSymbol = document.getElementById("gateSymbol");
const inputA = document.getElementById("inputA");
const inputB = document.getElementById("inputB");
const inputBControl = document.getElementById("inputBControl");
const calculateGateButton = document.getElementById("calculateGate");
const gateResult = document.getElementById("gateResult");
const gateExplanation = document.getElementById("gateExplanation");
const truthTableHead = document.getElementById("truthTableHead");
const truthTableBody = document.getElementById("truthTableBody");

let selectedGate = "AND";

const gateDescriptions = {
    AND: "Output is 1 only when both inputs are 1.",
    OR: "Output is 1 when at least one input is 1.",
    NOT: "Output is the opposite of input A.",
    NAND: "Output is the opposite of the AND gate.",
    NOR: "Output is the opposite of the OR gate.",
    XOR: "Output is 1 when the inputs are different.",
    XNOR: "Output is 1 when the inputs are the same."
};

function calculateOutput(gate, a, b) {
    switch (gate) {
        case "AND":
            return a && b ? 1 : 0;

        case "OR":
            return a || b ? 1 : 0;

        case "NOT":
            return a === 0 ? 1 : 0;

        case "NAND":
            return a && b ? 0 : 1;

        case "NOR":
            return a || b ? 0 : 1;

        case "XOR":
            return a !== b ? 1 : 0;

        case "XNOR":
            return a === b ? 1 : 0;

        default:
            return 0;
    }
}

function updateTruthTable() {
    const isNotGate = selectedGate === "NOT";

    truthTableHead.innerHTML = `
        <tr>
            <th>Input A</th>
            ${isNotGate ? "" : "<th>Input B</th>"}
            <th>Output (${selectedGate})</th>
        </tr>
    `;

    const rows = isNotGate
        ? [[0], [1]]
        : [[0, 0], [0, 1], [1, 0], [1, 1]];

    truthTableBody.innerHTML = rows.map(([a, b]) => {
        const output = calculateOutput(selectedGate, a, b);

        return `
            <tr>
                <td>${a}</td>
                ${isNotGate ? "" : `<td>${b}</td>`}
                <td><strong>${output}</strong></td>
            </tr>
        `;
    }).join("");
}

function selectGate(gate) {
    selectedGate = gate;

    gateButtons.forEach((button) => {
        button.classList.toggle(
            "active",
            button.dataset.gate === gate
        );
    });

    selectedGateTitle.textContent = `${gate} Gate`;
    gateSymbol.textContent = gate;
    gateExplanation.textContent = gateDescriptions[gate];

    inputBControl.hidden = gate === "NOT";

    gateResult.textContent = "—";
    updateTruthTable();
}

gateButtons.forEach((button) => {
    button.addEventListener("click", () => {
        selectGate(button.dataset.gate);
    });
});

calculateGateButton.addEventListener("click", async () => {
    const a = Number(inputA.value);
    const b = Number(inputB.value);

    try {
        gateResult.textContent = "...";
        gateExplanation.textContent = "Calculating using the C++ backend...";

        // Prepare the inputs for the C++ server
        const parameters = new URLSearchParams();

        parameters.append("operation", selectedGate);
        parameters.append("A", String(a));

        if (selectedGate !== "NOT") {
            parameters.append("B", String(b));
        }

        // Send the request to the C++ backend
        const response = await fetch("/api/gate", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: parameters.toString()
        });

        const data = await response.json();

        // Handle errors returned by C++
        if (!response.ok) {
            throw new Error(data.error || "Calculation failed.");
        }

        // Display the result returned by C++
        gateResult.textContent = data.result;

        gateExplanation.textContent =
            `${data.operation} gate: A = ${data.A}` +
            (data.operation === "NOT" ? "" : `, B = ${data.B}`) +
            ` → Output = ${data.result} (calculated by C++)`;

    } catch (error) {
        gateResult.textContent = "!";

        gateExplanation.textContent =
            "Could not calculate using the C++ backend. " +
            "Make sure the C++ server is running. " +
            error.message;

        console.error("C++ backend error:", error);
    }
});

selectGate("AND");

const booleanExpressionInput = document.getElementById("booleanExpression");
const variableControls = document.getElementById("variableControls");
const evaluateExpressionButton = document.getElementById("evaluateExpression");
const expressionResult = document.getElementById("expressionResult");
const expressionExplanation = document.getElementById("expressionExplanation");

function normalizeExpression(expression) {
    let result = expression.toUpperCase().replace(/\s+/g, "");

    // Reject characters outside the supported Boolean notation.
    if (!/^[A-Z0-9+.'()]*$/.test(result)) {
        throw new Error("Use variables A-Z, +, ., ', and parentheses only.");
    }

    if (!result || !/[A-Z]/.test(result)) {
        throw new Error("Enter an expression containing at least one variable.");
    }

    // Allow implicit AND: AB becomes A.B, and A(B+C) becomes A.(B+C).
    result = result.replace(/([A-Z0-9')])(?=[A-Z(])/g, "$1.");

    return result;
}

function getExpressionVariables(expression) {
    return [...new Set(expression.match(/[A-Z]/g) || [])].sort();
}

function createVariableControls(variables) {
    variableControls.innerHTML = "";

    variables.forEach((variable) => {
        const wrapper = document.createElement("div");
        wrapper.className = "variable-control";

        const label = document.createElement("label");
        label.textContent = `Variable ${variable}`;
        label.htmlFor = `variable-${variable}`;

        const select = document.createElement("select");
        select.id = `variable-${variable}`;
        select.dataset.variable = variable;

        select.innerHTML = `
            <option value="0">0 — OFF</option>
            <option value="1">1 — ON</option>
        `;

        wrapper.append(label, select);
        variableControls.appendChild(wrapper);
    });
}

function evaluateBooleanExpression(expression, values) {
    let position = 0;

    function parseOr() {
        let value = parseAnd();

        while (expression[position] === "+") {
            position++;
            const right = parseAnd();
            value = value || right;
        }

        return value;
    }

    function parseAnd() {
        let value = parseUnary();

        while (expression[position] === ".") {
            position++;
            const right = parseUnary();
            value = value && right;
        }

        return value;
    }

    function parseUnary() {
        if (expression[position] === "'") {
            throw new Error("A NOT symbol must follow a variable or closing parenthesis.");
        }

        let value;

        if (expression[position] === "(") {
            position++;
            value = parseOr();

            if (expression[position] !== ")") {
                throw new Error("Missing closing parenthesis.");
            }

            position++;
        } else {
            const variable = expression[position];

            if (!variable || !/[A-Z]/.test(variable)) {
                throw new Error(`Unexpected symbol at position ${position + 1}.`);
            }

            if (!(variable in values)) {
                throw new Error(`No value was provided for variable ${variable}.`);
            }

            value = values[variable] === 1;
            position++;
        }

        while (expression[position] === "'") {
            value = !value;
            position++;
        }

        return value;
    }

    const result = parseOr();

    if (position !== expression.length) {
        throw new Error(`Unexpected symbol at position ${position + 1}.`);
    }

    return result ? 1 : 0;
}

let detectedVariables = [];

booleanExpressionInput.addEventListener("input", () => {
    try {
        const normalized = normalizeExpression(booleanExpressionInput.value);
        detectedVariables = getExpressionVariables(normalized);

        createVariableControls(detectedVariables);

        expressionResult.textContent = "—";
        expressionExplanation.textContent = "Choose the input values and evaluate.";
        expressionExplanation.classList.remove("error-message");
    } catch (error) {
        detectedVariables = [];
        variableControls.innerHTML =
            '<p class="empty-variable-message">Enter a valid Boolean expression.</p>';

        expressionResult.textContent = "—";
        expressionExplanation.textContent = error.message;
        expressionExplanation.classList.add("error-message");
    }
});

evaluateExpressionButton.addEventListener("click", () => {
    try {
        const expression = normalizeExpression(booleanExpressionInput.value);
        const variables = getExpressionVariables(expression);

        if (variables.length === 0) {
            throw new Error("Enter a valid Boolean expression.");
        }

        const values = {};

        variables.forEach((variable) => {
            const select = document.getElementById(`variable-${variable}`);

            if (!select) {
                throw new Error(`Select a value for variable ${variable}.`);
            }

            values[variable] = Number(select.value);
        });

        const result = evaluateBooleanExpression(expression, values);

        expressionResult.textContent = result;
        expressionExplanation.textContent =
            `${expression} evaluates to ${result}.`;

        expressionExplanation.classList.remove("error-message");
    } catch (error) {
        expressionResult.textContent = "!";
        expressionExplanation.textContent = error.message;
        expressionExplanation.classList.add("error-message");
    }
});
const truthExpressionInput = document.getElementById("truthExpression");
const generateTruthTableButton = document.getElementById("generateTruthTable");
const generatedTableHead = document.getElementById("generatedTableHead");
const generatedTableBody = document.getElementById("generatedTableBody");
const truthTableMessage = document.getElementById("truthTableMessage");
const truthRowCount = document.getElementById("truthRowCount");

generateTruthTableButton.addEventListener("click", () => {
    try {
        const expression = normalizeExpression(truthExpressionInput.value);
        const variables = getExpressionVariables(expression);

        if (variables.length > 10) {
            throw new Error(
                "Please use 10 or fewer variables to keep the table manageable."
            );
        }

        const numberOfRows = 2 ** variables.length;

        generatedTableHead.innerHTML = `
            <tr>
                ${variables.map(v => `<th>${v}</th>`).join("")}
                <th>${expression}</th>
            </tr>
        `;

        let rowsHTML = "";

        for (let row = 0; row < numberOfRows; row++) {
            const values = {};

            variables.forEach((variable, index) => {
                const shift = variables.length - index - 1;
                values[variable] = (row >> shift) & 1;
            });

            const output = evaluateBooleanExpression(expression, values);

            rowsHTML += `
                <tr>
                    ${variables.map(v => `<td>${values[v]}</td>`).join("")}
                    <td><strong>${output}</strong></td>
                </tr>
            `;
        }

        generatedTableBody.innerHTML = rowsHTML;
        truthRowCount.textContent = `${numberOfRows} ROWS`;

        truthTableMessage.textContent =
            `Generated ${numberOfRows} rows for the expression ${expression}.`;

        truthTableMessage.classList.remove("error-message");
    } catch (error) {
        generatedTableHead.innerHTML = "";
        generatedTableBody.innerHTML = "";
        truthRowCount.textContent = "0 ROWS";

        truthTableMessage.textContent = error.message;
        truthTableMessage.classList.add("error-message");
    }
});
const simplifyExpressionInput = document.getElementById("simplifyExpression");
const simplifyButton = document.getElementById("simplifyButton");
const simplifiedResult = document.getElementById("simplifiedResult");
const simplifyExplanation = document.getElementById("simplifyExplanation");

function simplifyBooleanExpression(expression) {
    let result = expression.toUpperCase().replace(/\s+/g, "");

    if (!result) {
        throw new Error("Please enter a Boolean expression.");
    }

    if (!/^[A-Z0-9+.'()]*$/.test(result)) {
        throw new Error("Use variables A-Z, 0, 1, +, ., ', and parentheses only.");
    }

    const original = result;

    const rules = [
        {
            pattern: /([A-Z])\+\1/g,
            replacement: "$1",
            explanation: "Idempotent law: A + A = A"
        },
        {
            pattern: /([A-Z])\.\1/g,
            replacement: "$1",
            explanation: "Idempotent law: A . A = A"
        },
        {
            pattern: /([A-Z])\+0/g,
            replacement: "$1",
            explanation: "Identity law: A + 0 = A"
        },
        {
            pattern: /0\+([A-Z])/g,
            replacement: "$1",
            explanation: "Identity law: 0 + A = A"
        },
        {
            pattern: /([A-Z])\.1/g,
            replacement: "$1",
            explanation: "Identity law: A . 1 = A"
        },
        {
            pattern: /1\.([A-Z])/g,
            replacement: "$1",
            explanation: "Identity law: 1 . A = A"
        },
        {
            pattern: /([A-Z])\+1/g,
            replacement: "1",
            explanation: "Null law: A + 1 = 1"
        },
        {
            pattern: /1\+([A-Z])/g,
            replacement: "1",
            explanation: "Null law: 1 + A = 1"
        },
        {
            pattern: /([A-Z])\.0/g,
            replacement: "0",
            explanation: "Null law: A . 0 = 0"
        },
        {
            pattern: /0\.([A-Z])/g,
            replacement: "0",
            explanation: "Null law: 0 . A = 0"
        },
        {
            pattern: /([A-Z])\+([A-Z])'/g,
            replacement: "1",
            explanation: "Complement law: A + A' = 1"
        },
        {
            pattern: /([A-Z])'\+([A-Z])/g,
            replacement: "1",
            explanation: "Complement law: A' + A = 1"
        },
        {
            pattern: /([A-Z])\.([A-Z])'/g,
            replacement: "0",
            explanation: "Complement law: A . A' = 0"
        },
        {
            pattern: /([A-Z])'\.([A-Z])/g,
            replacement: "0",
            explanation: "Complement law: A' . A = 0"
        },
        {
            pattern: /([A-Z])\+\1\.[A-Z]/g,
            replacement: "$1",
            explanation: "Absorption law: A + A.B = A"
        },
        {
            pattern: /([A-Z])\.\(\1\+[A-Z]\)/g,
            replacement: "$1",
            explanation: "Absorption law: A.(A+B) = A"
        },
        {
            pattern: /\(([A-Z])\)/g,
            replacement: "$1",
            explanation: "Removed unnecessary parentheses."
        }
    ];

    let explanation = "No matching simplification rule was found.";
    let changed = true;
    let iterations = 0;

    while (changed && iterations < 20) {
        changed = false;
        iterations++;

        for (const rule of rules) {
            const updated = result.replace(rule.pattern, rule.replacement);

            if (updated !== result) {
                result = updated;
                explanation = rule.explanation;
                changed = true;
            }
        }
    }

    return {
        original,
        simplified: result,
        explanation:
            original === result
                ? "No supported simplification rule was applicable."
                : explanation
    };
}

simplifyButton.addEventListener("click", () => {
    try {
        const result = simplifyBooleanExpression(
            simplifyExpressionInput.value
        );

        simplifiedResult.textContent = result.simplified;
        simplifyExplanation.textContent =
            `${result.original} → ${result.simplified}. ${result.explanation}`;

        simplifyExplanation.classList.remove("error-message");
    } catch (error) {
        simplifiedResult.textContent = "!";
        simplifyExplanation.textContent = error.message;
        simplifyExplanation.classList.add("error-message");
    }
});

const expressionOneInput = document.getElementById("expressionOne");
const expressionTwoInput = document.getElementById("expressionTwo");

const checkEquivalenceButton = document.getElementById(
    "checkEquivalenceButton"
);

const equivalenceResult = document.getElementById("equivalenceResult");

const equivalenceExplanation = document.getElementById(
    "equivalenceExplanation"
);

const equivalenceTableBody = document.getElementById(
    "equivalenceTableBody"
);


// Check whether two Boolean expressions are equivalent
function checkBooleanEquivalence(expressionOne, expressionTwo) {

    if (!expressionOne.trim() || !expressionTwo.trim()) {
        throw new Error("Please enter both Boolean expressions.");
    }

    // Normalize both expressions
    const firstExpression = normalizeExpression(expressionOne);
    const secondExpression = normalizeExpression(expressionTwo);

    // Collect variables from both expressions
    const firstVariables = getExpressionVariables(firstExpression);
    const secondVariables = getExpressionVariables(secondExpression);

    // Combine variables and remove duplicates
    const variables = [
        ...new Set([...firstVariables, ...secondVariables])
    ].sort();

    // Prevent the browser from generating excessively large tables
    if (variables.length > 10) {
        throw new Error(
            "Please use 10 or fewer distinct variables."
        );
    }

    const totalRows = Math.pow(2, variables.length);

    const tableRows = [];

    let equivalent = true;

    // Generate every possible input combination
    for (let row = 0; row < totalRows; row++) {

        const values = {};

        // Assign 0 or 1 to each variable
        variables.forEach((variable, index) => {

            const bitPosition = variables.length - 1 - index;

            values[variable] = (row >> bitPosition) & 1;

        });

        // Evaluate both expressions
        const firstOutput = evaluateBooleanExpression(
            firstExpression,
            values
        );

        const secondOutput = evaluateBooleanExpression(
            secondExpression,
            values
        );

        // Compare outputs
        const matches = firstOutput === secondOutput;

        if (!matches) {
            equivalent = false;
        }

        tableRows.push({
            values,
            firstOutput,
            secondOutput,
            matches
        });
    }

    return {
        firstExpression,
        secondExpression,
        variables,
        equivalent,
        tableRows
    };
}


// Display the comparison table
function displayEquivalenceTable(result) {

    const headerInputs = result.variables.length
        ? result.variables.join(", ")
        : "No variables";

    const rowsHTML = result.tableRows.map(row => {

        const inputValues = result.variables.length
            ? result.variables.map(variable => row.values[variable]).join(", ")
            : "—";

        const matchText = row.matches ? "✓ Yes" : "✗ No";

        const matchClass = row.matches
            ? "equivalence-match"
            : "equivalence-mismatch";

        return `
            <tr>
                <td>${inputValues}</td>
                <td>${row.firstOutput}</td>
                <td>${row.secondOutput}</td>
                <td class="${matchClass}">${matchText}</td>
            </tr>
        `;

    }).join("");

    equivalenceTableBody.innerHTML = rowsHTML;

    // Update the first table heading
    const firstHeading = document.querySelector(
        "#equivalenceTable thead th:first-child"
    );

    if (firstHeading) {
        firstHeading.textContent = headerInputs;
    }
}


// Handle button click
checkEquivalenceButton.addEventListener("click", () => {

    try {

        const result = checkBooleanEquivalence(
            expressionOneInput.value,
            expressionTwoInput.value
        );

        // Display the result
        if (result.equivalent) {

            equivalenceResult.textContent = "✓ Equivalent";

            equivalenceExplanation.textContent =
                `${result.firstExpression} and ${result.secondExpression} ` +
                "produce identical outputs for every possible input combination.";

        } else {

            equivalenceResult.textContent = "✗ Not Equivalent";

            equivalenceExplanation.textContent =
                `${result.firstExpression} and ${result.secondExpression} ` +
                "produce different outputs for at least one input combination.";

        }

        equivalenceExplanation.classList.remove("equivalence-error");

        // Generate truth table
        displayEquivalenceTable(result);

    } catch (error) {

        equivalenceResult.textContent = "! Error";

        equivalenceExplanation.textContent = error.message;

        equivalenceExplanation.classList.add("equivalence-error");

        equivalenceTableBody.innerHTML = `
            <tr>
                <td colspan="4">
                    Please correct the expressions and try again.
                </td>
            </tr>
        `;

    }

});
// ========================================
// CALCULATION HISTORY - STORAGE & DISPLAY
// ========================================

const HISTORY_STORAGE_KEY = "logicLabCalculationHistory";

const historyList = document.getElementById("historyList");
const historyCount = document.getElementById("historyCount");
const historySearch = document.getElementById("historySearch");

const refreshHistoryButton = document.getElementById(
    "refreshHistoryButton"
);

const clearHistoryButton = document.getElementById(
    "clearHistoryButton"
);


// Get saved history safely
function getCalculationHistory() {
    try {
        const savedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);

        if (!savedHistory) {
            return [];
        }

        const parsedHistory = JSON.parse(savedHistory);

        return Array.isArray(parsedHistory) ? parsedHistory : [];

    } catch (error) {
        console.error("Could not load calculation history:", error);
        return [];
    }
}


// Save history to browser storage
function storeCalculationHistory(history) {
    try {
        localStorage.setItem(
            HISTORY_STORAGE_KEY,
            JSON.stringify(history)
        );

        return true;

    } catch (error) {
        console.error("Could not save calculation history:", error);

        alert("Unable to save history. Browser storage may be full or unavailable.");

        return false;
    }
}


// Add a real calculation to history
function saveCalculation(type, expression, result) {

    const history = getCalculationHistory();

    const entry = {
        id: crypto.randomUUID
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random()}`,

        type: String(type),
        expression: String(expression),
        result: String(result),
        timestamp: new Date().toISOString()
    };

    history.unshift(entry);

    // Keep the most recent 100 calculations
    const limitedHistory = history.slice(0, 100);

    if (storeCalculationHistory(limitedHistory)) {
        displayCalculationHistory();
    }
}


// Create an HTML element safely using textContent
function createHistoryText(tag, className, text) {

    const element = document.createElement(tag);

    element.className = className;
    element.textContent = text;

    return element;
}


// Display history entries
function displayCalculationHistory() {

    if (!historyList || !historyCount) {
        return;
    }

    const history = getCalculationHistory();

    const searchTerm = historySearch
        ? historySearch.value.trim().toLowerCase()
        : "";

    // Search expressions, results and calculation types
    const filteredHistory = history.filter(entry => {

        const searchableText = [
            entry.type,
            entry.expression,
            entry.result
        ].join(" ").toLowerCase();

        return searchableText.includes(searchTerm);
    });

    historyCount.textContent =
        `${history.length} ${history.length === 1 ? "CALCULATION" : "CALCULATIONS"}`;

    // Clear previous results
    historyList.replaceChildren();

    // Show empty state
    if (filteredHistory.length === 0) {

        const emptyContainer = document.createElement("div");
        emptyContainer.className = "history-empty";

        const icon = createHistoryText(
            "div",
            "history-empty-icon",
            "🧮"
        );

        const heading = createHistoryText(
            "h3",
            "",
            history.length === 0
                ? "No calculations yet"
                : "No matching calculations"
        );

        const description = createHistoryText(
            "p",
            "",
            history.length === 0
                ? "Your calculations will appear here when you use the available tools."
                : "Try a different search term."
        );

        emptyContainer.append(icon, heading, description);

        historyList.appendChild(emptyContainer);

        return;
    }

    // Display each saved calculation
    filteredHistory.forEach(entry => {

        const card = document.createElement("article");
        card.className = "history-item";

        const details = document.createElement("div");
        details.className = "history-item-details";

        const type = createHistoryText(
            "span",
            "history-item-type",
            entry.type
        );

        const expression = createHistoryText(
            "p",
            "history-item-expression",
            `Expression: ${entry.expression}`
        );

        const result = createHistoryText(
            "p",
            "history-item-result",
            `Result: ${entry.result}`
        );

        let formattedTime = "Time unavailable";

        if (entry.timestamp) {
            const date = new Date(entry.timestamp);

            if (!Number.isNaN(date.getTime())) {
                formattedTime = date.toLocaleString();
            }
        }

        const time = createHistoryText(
            "p",
            "history-item-time",
            formattedTime
        );

        details.append(type, expression, result, time);

        const deleteButton = createHistoryText(
            "button",
            "history-delete-button",
            "Delete"
        );

        deleteButton.type = "button";
        deleteButton.dataset.historyId = entry.id;
        deleteButton.setAttribute(
            "aria-label",
            `Delete calculation ${entry.expression}`
        );

        card.append(details, deleteButton);

        historyList.appendChild(card);
    });
}


// Refresh history
if (refreshHistoryButton) {
    refreshHistoryButton.addEventListener("click", () => {
        displayCalculationHistory();
    });
}


// Search history while typing
if (historySearch) {
    historySearch.addEventListener("input", () => {
        displayCalculationHistory();
    });
}


// Delete one calculation
if (historyList) {

    historyList.addEventListener("click", event => {

        const deleteButton = event.target.closest(
            ".history-delete-button"
        );

        if (!deleteButton) {
            return;
        }

        const historyId = deleteButton.dataset.historyId;

        const updatedHistory = getCalculationHistory().filter(
            entry => entry.id !== historyId
        );

        if (storeCalculationHistory(updatedHistory)) {
            displayCalculationHistory();
        }
    });
}


// Clear all history
if (clearHistoryButton) {

    clearHistoryButton.addEventListener("click", () => {

        const history = getCalculationHistory();

        if (history.length === 0) {
            alert("Your history is already empty.");
            return;
        }

        const confirmed = confirm(
            "Are you sure you want to delete all calculation history?"
        );

        if (!confirmed) {
            return;
        }

        if (storeCalculationHistory([])) {
            displayCalculationHistory();
        }
    });
}


// Load saved history when the page opens
displayCalculationHistory();
showPage("dashboard");