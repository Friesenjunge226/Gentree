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
        renderSidebar(masterTaxonomy.children, taxonomyContainer);
    });

function renderSidebar(nodes, container, parentPath = []) {
    nodes.forEach(node => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'tax-item';
        
        const currentPath = [...parentPath, node.name];
        const labelSpan = document.createElement('span');
        labelSpan.className = 'tax-label';
        labelSpan.innerText = (node.children && node.children.length > 0) ? `📁 ${node.name}` : `🏷️ ${node.name}`;
        
        itemDiv.appendChild(labelSpan);
        container.appendChild(itemDiv);

        if (node.children && node.children.length > 0) {
            const childrenContainer = document.createElement('div');
            childrenContainer.className = 'tax-children';
            container.appendChild(childrenContainer);
            
            labelSpan.onclick = () => {
                childrenContainer.classList.toggle('open');
            };
            renderSidebar(node.children, childrenContainer, currentPath);
        } else {
            // Leaf node (konkretes Label)
            labelSpan.onclick = () => openIntensityPanel(node, currentPath);
        }
    });
}

// --- 2. Intensity Slider Logic ---
function openIntensityPanel(node, path) {
    selectedNodeData = { node, path };
    document.getElementById('selected-label').innerText = node.name;
    document.getElementById('selected-desc').innerText = node.description;
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
// Innovativ: Wir konvertieren den Hex, erzwingen eine Sättigung und mappen die "Intensity" direkt auf die "Lightness"
function adjustColorBrightness(hex, intensityPercent) {
    if(hex === "#000000" || hex === "#FFFFFF") return hex; // Edgecases für reine s/w Flags
    
    // Hex to RGB
    let r = 0, g = 0, b = 0;
    if (hex.length == 4) {
        r = "0x" + hex[1] + hex[1];
        g = "0x" + hex[2] + hex[2];
        b = "0x" + hex[3] + hex[3];
    } else if (hex.length == 7) {
        r = "0x" + hex[1] + hex[2];
        g = "0x" + hex[3] + hex[4];
        b = "0x" + hex[5] + hex[6];
    }
    r /= 255; g /= 255; b /= 255;

    let cmin = Math.min(r,g,b), cmax = Math.max(r,g,b), delta = cmax - cmin, h = 0, s = 0, l = 0;
    if (delta == 0) h = 0;
    else if (cmax == r) h = ((g - b) / delta) % 6;
    else if (cmax == g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    h = Math.round(h * 60);
    if (h < 0) h += 360;

    l = (cmax + cmin) / 2;
    s = delta == 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
    s = +(s * 100).toFixed(1);

    // Mappe den Slider (10-100) auf Lightness (z.B. 15% bis 70%, damit es nicht rein weiß wird)
    const newLightness = 15 + ((intensityPercent / 100) * 55); 
    return `hsl(${h}, 100%, ${newLightness}%)`;
}

// --- 4. Baum-Manipulation ---
function injectIntoActiveTree(path, color, targetName) {
    let currentLevel = activeTree.children;
    
    // Navigiere durch die Kategorien (überspringe Root [0] und das Label selbst [letztes Element])
    for (let i = 1; i < path.length - 1; i++) {
        const pathNodeName = path[i];
        let existingCategory = currentLevel.find(n => n.name === pathNodeName);
        
        if (existingCategory) {
            if (!existingCategory.children) existingCategory.children = [];
            currentLevel = existingCategory.children;
        }
    }
    
    // Jetzt sind wir im richtigen Ordner. Label hinzufügen oder aktualisieren.
    let leafNode = currentLevel.find(n => n.name === targetName);
    if (!leafNode) {
        currentLevel.push({ name: targetName, color: color });
    } else {
        leafNode.color = color; // Falls der User die Farbe überschreibt
    }

// --- 5. D3.js Setup & Rendering ---
const margin = {top: 20, right: 120, bottom: 20, left: 120};
const width = window.innerWidth - 350 - margin.right - margin.left;
const height = window.innerHeight - margin.top - margin.bottom;

const svg = d3.select("#identity-canvas")
    .attr("width", width + margin.right + margin.left)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

const treemap = d3.tree().size([height, width]);

function updateD3Tree() {
    svg.selectAll("*").remove(); // Bruteforce Clean für dieses Beispiel, kann in Prod sanfter animiert werden

    const root = d3.hierarchy(activeTree, d => d.children);
    root.x0 = height / 2;
    root.y0 = 0;

    const treeData = treemap(root);
    const nodes = treeData.descendants();
    const links = treeData.descendants().slice(1);

    // Nodes auf der X-Achse gleichmäßig verteilen
    nodes.forEach(d => { d.y = d.depth * 180 });

    // Links zeichnen
    svg.selectAll(".link")
        .data(links)
        .enter().append("path")
        .attr("class", "link")
        .attr("d", d => {
            return "M" + d.y + "," + d.x
                 + "C" + (d.y + d.parent.y) / 2 + "," + d.x
                 + " " + (d.y + d.parent.y) / 2 + "," + d.parent.x
                 + " " + d.parent.y + "," + d.parent.x;
        });

    // Nodes zeichnen
    const node = svg.selectAll(".node")
        .data(nodes)
        .enter().append("g")
        .attr("class", "node")
        .attr("transform", d => "translate(" + d.y + "," + d.x + ")");

    node.append("circle")
        .attr("r", 8)
        .style("fill", d => d.data.color || "#808080");

    node.append("text")
        .attr("dy", ".35em")
        .attr("x", d => d.children || d._children ? -13 : 13)
        .style("text-anchor", d => d.children || d._children ? "end" : "start")
        .text(d => d.data.name);
}

// Initiales Rendern des leeren Baums
updateD3Tree();

// --- 6. Export Funktion (SVG to PNG) ---
document.getElementById('export-btn').addEventListener('click', () => {
    const svgElement = document.getElementById('identity-canvas');
    const serializer = new XMLSerializer();
    let source = serializer.serializeToString(svgElement);
    
    // Namespace und Background hinzufügen
    if(!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)){
        source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    source = source.replace(/^<svg/, '<svg style="background-color:#121212;"');

    const image = new Image();
    image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(source);
    
    image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = svgElement.clientWidth;
        canvas.height = svgElement.clientHeight;
        const context = canvas.getContext('2d');
        context.drawImage(image, 0, 0);
        
        const a = document.createElement('a');
        a.download = 'my_identity_map.png';
        a.href = canvas.toDataURL('image/png');
        a.click();
    };
});

// Sidebar Suchfunktion (simpel gehalten)
searchBar.addEventListener('input', function(e) {
    const term = e.target.value.toLowerCase();
    const items = document.querySelectorAll('.tax-item');
    items.forEach(item => {
        if (item.innerText.toLowerCase().includes(term)) {
            item.style.display = 'block';
            // Öffne Parents, wenn Treffer gefunden
            let parent = item.parentElement;
            while(parent && parent.classList.contains('tax-children')) {
                parent.classList.add('open');
                parent = parent.parentElement.parentElement; // Hoch navigieren
            }
        } else {
            // Nur verstecken, wenn es keine offene Kategorie ist
            if(!item.querySelector('.tax-children')) {
                item.style.display = 'none';
            }
        }
    });
});
