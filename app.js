let masterTaxonomy = null;
let activeTree = null; // Wird jetzt dynamisch mit Kategorien gefüllt
let selectedNodeData = null;

// DOM Elemente
const taxonomyContainer = document.getElementById('taxonomy-tree');
const searchBar = document.getElementById('search-bar');
const intensityPanel = document.getElementById('intensity-panel');
const slider = document.getElementById('intensity-slider');
const addToCanvasBtn = document.getElementById('add-to-canvas-btn');
const cancelBtn = document.getElementById('cancel-btn');

// Baut ein Grundgerüst, das nur die Ordner/Kategorien enthält (ohne die eigentlichen Labels)
function buildCategorySkeleton(node) {
    const newNode = { name: node.name, color: "#333333", children: [] };
    if (node.children && node.children.length > 0) {
        node.children.forEach(child => {
            // Wenn das Kind selbst wieder Kinder hat, ist es eine Kategorie
            if (child.children && child.children.length > 0) {
                newNode.children.push(buildCategorySkeleton(child));
            }
        });
    }
    return newNode;
}

// --- 1. Daten laden und Sidebar bauen ---
fetch('taxonomy.json')
    .then(response => response.json())
    .then(data => {
        masterTaxonomy = data;
        // Initialisiere den Baum direkt mit allen Kategorien
        activeTree = buildCategorySkeleton(masterTaxonomy); 
        
        // Root-Element in der Sidebar überspringen und nur Kinder rendern
        renderSidebar(masterTaxonomy.children, taxonomyContainer, [masterTaxonomy.name]);
        updateD3Tree(); // Zeichne das Skelett sofort
    });

function renderSidebar(nodes, container, parentPath = []) {
    nodes.forEach(node => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'tax-item';
        
        const currentPath = [...parentPath, node.name];
        const labelSpan = document.createElement('span');
        labelSpan.className = 'tax-label';
        
        const hasChildren = node.children && node.children.length > 0;
        
        if (hasChildren) {
            // Kategorie: Mit rotierendem Pfeil
            labelSpan.innerHTML = `<span class="caret">▶</span> 📁 ${node.name}`;
            itemDiv.appendChild(labelSpan);
            container.appendChild(itemDiv);

            const childrenContainer = document.createElement('div');
            childrenContainer.className = 'tax-children';
            container.appendChild(childrenContainer);
            
            labelSpan.onclick = () => {
                childrenContainer.classList.toggle('open');
                labelSpan.querySelector('.caret').classList.toggle('open');
            };
            
            renderSidebar(node.children, childrenContainer, currentPath);
        } else {
            // Konkretes Label (Leaf)
            labelSpan.innerHTML = `&nbsp;&nbsp;&nbsp;&nbsp;🏷️ ${node.name}`; // Einrücken für Optik
            itemDiv.appendChild(labelSpan);
            container.appendChild(itemDiv);
            
            labelSpan.onclick = () => openIntensityPanel(node, currentPath);
        }
    });
}

// --- 2. Intensity Slider Logic ---
function openIntensityPanel(node, path) {
    selectedNodeData = { node, path };
    document.getElementById('selected-label').innerText = node.name;
    document.getElementById('selected-desc').innerText = node.description || "Keine Beschreibung verfügbar.";
    slider.value = 70; // Reset
    intensityPanel.classList.remove('hidden');
}

cancelBtn.onclick = () => {
    intensityPanel.classList.add('hidden');
    selectedNodeData = null;
};

addToCanvasBtn.onclick = () => {
    if (!selectedNodeData) return;
    const intensity = parseInt(slider.value, 10);
    const finalColor = adjustColorBrightness(selectedNodeData.node.color, intensity);
    
    injectIntoActiveTree(selectedNodeData.path, finalColor, selectedNodeData.node.name);
    updateD3Tree();
    intensityPanel.classList.add('hidden');
};

// --- 3. Hex zu HSL Konvertierung ---
function adjustColorBrightness(hex, intensityPercent) {
    if(!hex) hex = "#ffffff"; // Fallback, falls kein Color-Code existiert
    if(hex === "#000000" || hex === "#FFFFFF") return hex; 
    
    let r = 0, g = 0, b = 0;
    if (hex.length == 4) {
        r = "0x" + hex[1] + hex[1];
        g = "0x" + hex[2] + hex[2];
        b = "0x" + hex[3] + hex[3];
    } else if (hex.length == 7) {
        r = "0x" + hex[1] + hex[2];
        g = "0x" + hex[3]
