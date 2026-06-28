let masterTaxonomy = null;
let activeTree = null;
let selectedNodeData = null;

const taxonomyContainer = document.getElementById('taxonomy-tree');
const searchBar = document.getElementById('search-bar');
const intensityPanel = document.getElementById('intensity-panel');
const slider = document.getElementById('intensity-slider');
const addToCanvasBtn = document.getElementById('add-to-canvas-btn');
const cancelBtn = document.getElementById('cancel-btn');

function buildCategorySkeleton(node) {
    const newNode = { name: node.name, color: "#333333", children: [] };
    if (node.children) {
        node.children.forEach(child => {
            if (child.children) newNode.children.push(buildCategorySkeleton(child));
        });
    }
    return newNode;
}

fetch('taxonomy.json')
    .then(r => r.json())
    .then(data => {
        masterTaxonomy = data;
        activeTree = buildCategorySkeleton(masterTaxonomy);
        renderSidebar(masterTaxonomy.children, taxonomyContainer, [masterTaxonomy.name]);
        updateD3Tree();
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
            labelSpan.innerHTML = `&nbsp;&nbsp;&nbsp;&nbsp;🏷️ ${node.name}`;
            itemDiv.appendChild(labelSpan);
            container.appendChild(itemDiv);
            labelSpan.onclick = () => openIntensityPanel(node, currentPath);
        }
    });
}

function openIntensityPanel(node, path) {
    selectedNodeData = { node, path };
    document.getElementById('selected-label').innerText = node.name;
    document.getElementById('selected-desc').innerText = node.description || "";
    intensityPanel.classList.remove('hidden');
}

addToCanvasBtn.onclick = () => {
    if (!selectedNodeData) return;
    const intensity = parseInt(slider.value, 10);
    const finalColor = adjustColorBrightness(selectedNodeData.node.color, intensity);
    injectIntoActiveTree(selectedNodeData.path, finalColor, selectedNodeData.node.name);
    updateD3Tree();
    intensityPanel.classList.add('hidden');
};

function adjustColorBrightness(hex, intensityPercent) {
    if(!hex) hex = "#ffffff";
    // ... (Hier der HSL-Konvertierungs-Code aus der vorherigen Nachricht) ...
    // Kürze: Einfach die Funktion von vorhin hier einfügen.
    return hex; 
}

function injectIntoActiveTree(path, color, targetName) {
    let currentLevel = activeTree.children;
    for (let i = 1; i < path.length - 1; i++) {
        let existingCategory = currentLevel.find(n => n.name === path[i]);
        if (existingCategory) {
            if (!existingCategory.children) existingCategory.children = [];
            currentLevel = existingCategory.children;
        }
    }
    let leafNode = currentLevel.find(n => n.name === targetName);
    if (!leafNode) currentLevel.push({ name: targetName, color: color });
    else leafNode.color = color;
}

const margin = {top: 50, right: 20, bottom: 50, left: 20};
const width = window.innerWidth - 350 - margin.right - margin.left;
const height = window.innerHeight - margin.top - margin.bottom;
const svg = d3.select("#identity-canvas").attr("width", width + margin.right + margin.left).attr("height", height + margin.top + margin.bottom).append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");
const treemap = d3.tree().size([width, height]);

function updateD3Tree() {
    svg.selectAll("*").remove();
    const root = d3.hierarchy(activeTree, d => d.children);
    const treeData = treemap(root);
    const nodes = treeData.descendants();
    const links = treeData.descendants().slice(1);
    nodes.forEach(d => { d.y = d.depth * 140 });

    svg.selectAll(".link").data(links).enter().append("path").attr("class", "link").attr("d", d => {
        const s = d.parent, t = d, r = 12, midY = s.y + (t.y - s.y) / 2;
        const dirX = t.x > s.x ? 1 : -1, dirY = t.y > s.y ? 1 : -1;
        return `M ${s.x} ${s.y} L ${s.x} ${midY - r * dirY} Q ${s.x} ${midY} ${s.x + r * dirX} ${midY} L ${t.x - r * dirX} ${midY} Q ${t.x} ${midY} ${t.x} ${midY + r * dirY} L ${t.x} ${t.y}`;
    });

    const node = svg.selectAll(".node").data(nodes).enter().append("g").attr("class", "node").attr("transform", d => `translate(${d.x},${d.y})`);
    node.append("circle").attr("r", 8).style("fill", d => d.data.color || "#333333");
    node.append("text").attr("dy", "2em").style("text-anchor", "middle").text(d => d.data.name).style("fill", d => (d.children || d._children) ? "var(--text-muted)" : "var(--text-main)");
}

document.getElementById('export-btn').addEventListener('click', () => { /* Export Code wie oben */ });
