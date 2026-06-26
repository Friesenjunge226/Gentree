// 1. Setup der Daten
let masterData = null;
let activeTreeData = { name: "Root", children: [
    { name: "Sexuality & Romantic Orientation", children: [] },
    { name: "Gender Identity", children: [] }
]};

// D3 SVG Selection
const svg = d3.select("#tree-canvas").append("svg").attr("width", "100%").attr("height", "100%");

// 2. Daten laden
fetch('taxonomy.json')
    .then(response => response.json())
    .then(data => {
        masterData = data;
        renderSidebar(data);
        updateTree();
    });

// 3. Baum-Render-Funktion (Der "Magic" Teil)
function updateTree() {
    // Hier berechnet D3.js die Positionen der Knoten basierend auf activeTreeData
    const root = d3.hierarchy(activeTreeData);
    const treeLayout = d3.tree().size([800, 400]);
    treeLayout(root);

    // D3 Code zum Zeichnen der Linien (Links) und Kreise (Nodes)
    // Inklusive der Helligkeitslogik via HSL
}

// 4. Sidebar Logik
function renderSidebar(data) {
    // Logik für Suchleiste und Collapsible Folder (rekursives Erstellen von DOM-Elementen)
}

// 5. Export-Funktion (PNG Download)
function exportToImage() {
    const svgElement = document.querySelector("svg");
    // Serialisierung des SVGs zu einer DataURL und Trigger des Downloads
}
