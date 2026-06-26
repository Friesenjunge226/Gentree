let masterData = null;
let activeTreeData = { name: "Identitäts-Karte", children: [
    { name: "Sexuality & Romantic Orientation", children: [] },
    { name: "Gender Identity", children: [] }
]};

// D3 Setup
const width = 800;
const height = 600;
const svg = d3.select("#tree-canvas").append("svg")
    .attr("viewBox", [0, 0, width, height]);

const g = svg.append("g").attr("transform", "translate(50,50)");

fetch('taxonomy.json')
    .then(response => response.json())
    .then(data => {
        masterData = data;
        renderSidebar(data.children);
        updateTree();
    });

function renderSidebar(nodes, container = d3.select("#folder-container")) {
    const list = container.append("ul");
    nodes.forEach(node => {
        const li = list.append("li");
        li.append("span")
            .text(node.name)
            .style("cursor", "pointer")
            .on("click", () => addNodeToTree(node));
        
        if (node.children && node.children.length > 0) {
            renderSidebar(node.children, li);
        }
    });
}

function addNodeToTree(nodeData) {
    // Einfache Logik: Wir fügen das gewählte Label unter der passenden Wurzel hinzu
    // In einer echten App würde man hier die Hierarchie-Pfad-Logik verfeinern
    activeTreeData.children[0].children.push(nodeData); 
    updateTree();
}

function updateTree() {
    const intensity = document.getElementById("intensity").value;
    const root = d3.hierarchy(activeTreeData);
    const treeLayout = d3.tree().size([height - 100, width - 200]);
    treeLayout(root);

    // Linien zeichnen
    g.selectAll(".link").data(root.links()).join("path")
        .attr("class", "link")
        .attr("d", d3.linkHorizontal().x(d => d.y).y(d => d.x));

    // Knoten zeichnen
    const node = g.selectAll(".node").data(root.descendants()).join("g")
        .attr("class", "node")
        .attr("transform", d => `translate(${d.y},${d.x})`);

    node.selectAll("circle").join("circle")
        .attr("r", 8)
        .style("fill", d => {
            // Helligkeitslogik: Nutze die Farbe aus dem JSON + Intensity
            return d.data.color ? d3.hsl(d.data.color).brighter(intensity / 50) : "#ccc";
        });

    node.selectAll("text").join("text")
        .attr("dy", 3)
        .attr("x", 12)
        .text(d => d.data.name);
}

// Slider Event
document.getElementById("intensity").addEventListener("input", updateTree);

// Export Funktion
document.getElementById("export-btn").addEventListener("click", () => {
    const svgData = new XMLSerializer().serializeToString(document.querySelector("svg"));
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        const link = document.createElement("a");
        link.download = "meine-identitaet.png";
        link.href = canvas.toDataURL("image/png");
        link.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
});
