(() => {
  const chart = document.getElementById("sunburst");
  const status = document.getElementById("status");
  const homeButton = document.getElementById("home-button");
  const familyList = document.getElementById("family-list");
  const detailCard = document.getElementById("detail-card");

  // Paleta validada en Jupyter: un color fijo por familia.
  const palette = {
    "Satélites naturales": "#636EFA",
    "Planetas": "#EF553B",
    "Asteroides": "#00CC96",
    "Cometas": "#AB63FA",
    "Estrellas": "#FFA15A",
    "Planetas enanos": "#19D3F3",
    "Objetos transneptunianos": "#FF6692"
  };

  let rows = [];
  let ids = [];
  let labels = [];
  let parents = [];
  let values = [];
  let colors = [];
  let nodeInfo = new Map();
  let familyButtons = new Map();

  function addNode(id, label, parent, value, color, info) {
    if (nodeInfo.has(id)) {
      nodeInfo.get(id).value += value;
      return;
    }
    ids.push(id);
    labels.push(label);
    parents.push(parent);
    values.push(value);
    colors.push(color);
    nodeInfo.set(id, { id, label, parent, value, color, ...info });
  }

  function prepareHierarchy(data) {
    const familyCounts = new Map();
    const destinationCounts = new Map();
    const uniqueMissions = new Map();

    data.forEach(row => {
      const family = String(row.familia || "Sin familia");
      const destination = String(row.destino || "Destino sin nombre");
      const mission = String(row.mision || row.name || row.short_name || "Misión sin nombre");
      const familyId = `familia:${family}`;
      const destinationId = `${familyId}|destino:${destination}`;
      const missionId = `${destinationId}|mision:${mission}`;

      familyCounts.set(family, (familyCounts.get(family) || 0) + 1);
      destinationCounts.set(destinationId, (destinationCounts.get(destinationId) || 0) + 1);
      if (!uniqueMissions.has(missionId)) {
        uniqueMissions.set(missionId, { family, destination, mission, familyId, destinationId });
      }
    });

    addNode("root", "Misiones planetarias", "", data.length, "#0b1525", {
      type: "Raíz", description: "Vista general de las asociaciones entre misiones y destinos."
    });

    const familyOrder = [...familyCounts.keys()].sort((a, b) => a.localeCompare(b, "es"));
    familyOrder.forEach(family => {
      const familyId = `familia:${family}`;
      const familyRows = data.filter(row => String(row.familia || "Sin familia") === family);
      const color = palette[family] || "#38bdf8";
      addNode(familyId, family, "root", familyRows.length, color, {
        type: "Familia", description: `${familyRows.length} asociaciones misión-destino.`,
        family, destination: "", mission: ""
      });

      const destinations = [...new Set(familyRows.map(row => String(row.destino || "Destino sin nombre")))]
        .sort((a, b) => a.localeCompare(b, "es"));
      destinations.forEach(destination => {
        const destinationId = `${familyId}|destino:${destination}`;
        const destinationRows = familyRows.filter(row => String(row.destino || "Destino sin nombre") === destination);
        addNode(destinationId, destination, familyId, destinationRows.length, color, {
          type: "Destino", description: `${destinationRows.length} asociación(es) con misiones.`,
          family, destination, mission: ""
        });

        const missions = [...new Set(destinationRows.map(row =>
          String(row.mision || row.name || row.short_name || "Misión sin nombre")
        ))].sort((a, b) => a.localeCompare(b, "es"));

        missions.forEach(mission => {
          const missionId = `${destinationId}|mision:${mission}`;
          addNode(missionId, mission, destinationId, 1, color, {
            type: "Misión", description: `Misión asociada a ${destination}.`,
            family, destination, mission
          });
        });
      });
    });
  }

  function renderDetails(info) {
    detailCard.replaceChildren();
    if (!info) {
      const p = document.createElement("p");
      p.className = "detail-placeholder";
      p.textContent = "Selecciona una familia, un destino o una misión para consultar sus detalles.";
      detailCard.appendChild(p);
      return;
    }
    const kicker = document.createElement("p");
    kicker.className = "detail-kicker";
    kicker.textContent = info.type || "Elemento";
    const title = document.createElement("h3");
    title.className = "detail-title";
    title.textContent = info.label;
    const description = document.createElement("p");
    description.className = "detail-description";
    description.textContent = info.description || "";
    detailCard.append(kicker, title, description);
    if (info.family && info.type !== "Familia") addMeta("Familia", info.family);
    if (info.destination) addMeta("Destino", info.destination);
    if (info.mission) addMeta("Misión", info.mission);

    function addMeta(label, value) {
      const p = document.createElement("p");
      p.className = "detail-meta";
      p.textContent = `${label}: ${value}`;
      detailCard.appendChild(p);
    }
  }

  async function renderChartForRoot(rootId) {
    let chartIds = ids;
    let chartLabels = labels;
    let chartParents = parents;
    let chartValues = values;
    let chartColors = colors;
    let maxdepth = -1;

    if (rootId !== "root") {
      const selected = nodeInfo.get(rootId);
      if (!selected || selected.type !== "Familia") return;
      const familyRows = rows.filter(row => String(row.familia || "Sin familia") === selected.family);
      chartIds = [rootId];
      chartLabels = [selected.label];
      chartParents = [""];
      chartValues = [familyRows.length];
      chartColors = [selected.color];

      const destinations = [...new Set(familyRows.map(row => String(row.destino || "Destino sin nombre")))]
        .sort((a, b) => a.localeCompare(b, "es"));

      destinations.forEach(destination => {
        const destinationId = `${rootId}|destino:${destination}`;
        const destinationRows = familyRows.filter(row => String(row.destino || "Destino sin nombre") === destination);
        chartIds.push(destinationId);
        chartLabels.push(destination);
        chartParents.push(rootId);
        chartValues.push(destinationRows.length);
        chartColors.push(selected.color);

        [...new Set(destinationRows.map(row =>
          String(row.mision || row.name || row.short_name || "Misión sin nombre")
        ))].sort((a, b) => a.localeCompare(b, "es")).forEach(mission => {
          chartIds.push(`${destinationId}|mision:${mission}`);
          chartLabels.push(mission);
          chartParents.push(destinationId);
          chartValues.push(1);
          chartColors.push(selected.color);
        });
      });
      maxdepth = -1;
    }

    const trace = {
      type: "sunburst",
      ids: chartIds,
      labels: chartLabels,
      parents: chartParents,
      values: chartValues,
      branchvalues: "total",
      sort: false,
      maxdepth,
      insidetextorientation: "radial",
      insidetextfont: { color: "#FFFFFF" },
      textinfo: "label",
      hovertemplate: "<b>%{label}</b><br>Asociaciones: %{value}<extra></extra>",
      marker: { colors: chartColors, line: { color: "#0b1220", width: 2 } }
    };
    await Plotly.react(chart, [trace], {
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
      font: { family: 'Inter, system-ui, -apple-system, "Segoe UI", sans-serif', color: "#e5edf7", size: 12 },
      margin: { t: 24, r: 20, b: 20, l: 20 },
      autosize: true,
      uniformtext: { minsize: 10, mode: "hide" },
      sunburstcolorway: Object.values(palette),
      extendsunburstcolors: false
    }, { responsive: true, displaylogo: false, modeBarButtonsToRemove: ["toImage", "select2d", "lasso2d"] });

    chart.removeAllListeners("plotly_sunburstclick");
    chart.on("plotly_sunburstclick", event => {
      const point = event?.points?.[0];
      const info = point && nodeInfo.get(point.id);
      if (info) {
        renderDetails(info);
        status.textContent = `${info.type}: ${info.label}.`;
      }
    });
  }

  function renderFamilyButtons() {
    familyList.replaceChildren();
    const families = [...nodeInfo.values()].filter(item => item.type === "Familia");
    families.forEach(info => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "family-button";
      const marker = document.createElement("span");
      marker.className = "marker";
      marker.style.background = info.color;
      marker.style.color = info.color;
      marker.setAttribute("aria-hidden", "true");
      const label = document.createElement("span");
      label.textContent = info.label;
      button.append(marker, label);
      button.addEventListener("click", async () => {
        try {
          await renderChartForRoot(info.id);
          renderDetails(info);
          familyButtons.forEach(item => item.removeAttribute("aria-current"));
          button.setAttribute("aria-current", "true");
          status.textContent = `Familia seleccionada: ${info.label}. Haz clic en un destino para explorar sus misiones.`;
        } catch (error) {
          console.error("No se ha podido seleccionar la familia:", error);
          status.textContent = "No se ha podido cambiar de familia. Revisa la consola del navegador.";
        }
      });
      familyButtons.set(info.label, button);
      familyList.appendChild(button);
    });
  }

  async function init() {
    try {
      const response = await fetch("./datos_sunburst.json");
      if (!response.ok) throw new Error("No se ha encontrado datos_sunburst.json");
      const data = await response.json();
      if (!Array.isArray(data) || !data.length) throw new Error("El archivo JSON no contiene filas.");
      rows = data;
      prepareHierarchy(rows);
      renderFamilyButtons();

      const trace = {
        type: "sunburst",
        ids,
        labels,
        parents,
        values,
        branchvalues: "total",
        sort: false,
        maxdepth: -1,
        insidetextorientation: "radial",
        insidetextfont: { color: "#FFFFFF" },
        textinfo: "label",
        hovertemplate: "<b>%{label}</b><br>Asociaciones: %{value}<extra></extra>",
        marker: {
          colors,
          line: { color: "#0b1220", width: 2 }
        },
        root: { id: "root" },
        leaf: { opacity: 0.95 }
      };

      const layout = {
        paper_bgcolor: "rgba(0,0,0,0)",
        plot_bgcolor: "rgba(0,0,0,0)",
        font: { family: 'Inter, system-ui, -apple-system, "Segoe UI", sans-serif', color: "#e5edf7", size: 12 },
        margin: { t: 24, r: 20, b: 20, l: 20 },
        autosize: true,
        uniformtext: { minsize: 10, mode: "hide" },
        sunburstcolorway: Object.values(palette),
        extendsunburstcolors: false
      };

      await Plotly.newPlot(chart, [trace], layout, {
        responsive: true,
        displaylogo: false,
        modeBarButtonsToRemove: ["toImage", "select2d", "lasso2d"]
      });

      chart.on("plotly_sunburstclick", event => {
        const id = event?.points?.[0]?.id;
        if (id && nodeInfo.has(id)) {
          const info = nodeInfo.get(id);
          renderDetails(info);
          status.textContent = `${info.type}: ${info.label}.`;
        }
      });

      homeButton.addEventListener("click", async () => {
        try {
          await renderChartForRoot("root");
          familyButtons.forEach(item => item.removeAttribute("aria-current"));
          renderDetails(nodeInfo.get("root"));
          status.textContent = "Vista general: familias, destinos y misiones. Selecciona una familia para profundizar.";
        } catch (error) {
          console.error("No se ha podido volver a la vista general:", error);
          status.textContent = "No se ha podido volver al inicio. Revisa la consola del navegador.";
        }
      });

      renderDetails(nodeInfo.get("root"));
      status.textContent = `Datos cargados: ${rows.length} asociaciones, ${familiesCount()} familias.`;
    } catch (error) {
      console.error(error);
      status.textContent = `No se han podido cargar los datos: ${error.message}. Comprueba que datos_sunburst.json esté junto a index.html.`;
      familyList.innerHTML = '<p class="loading">No se han podido cargar las familias.</p>';
    }
  }

  function familiesCount() {
    return [...nodeInfo.values()].filter(item => item.type === "Familia").length;
  }

  init();
})();
