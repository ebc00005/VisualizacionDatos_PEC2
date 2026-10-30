(() => {
  const container = document.getElementById("canvas-container");
  const status = document.getElementById("status");
  const homeButton = document.getElementById("home-button");
  const missionList = document.getElementById("mission-list");
  const detailCard = document.getElementById("detail-card");
  let selectedNode = null;

  // El JSON debe estar en la misma carpeta que index.html.
  const DATA_URL = "./misiones_jerarquia.json";
  const COLORS = {
    root: "#f59e0b",
    mission: "#38bdf8",
    spacecraft: "#34d399",
    instrument: "#a78bfa",
    link: "#475569",
    label: "#e2e8f0"
  };

  if (!window.hyt) {
    status.textContent = "No se ha podido cargar D3-Hypertree. Comprueba la conexión y la librería.";
    return;
  }

  function compactLabel(fullName, depth) {
    const name = String(fullName || "").trim();
    if (!name) return "";
    if (depth === 0) return "Misiones";

    // Mission labels: short names that remain recognizable.
    if (depth === 1) {
      const aliases = {
        "Mars Science Laboratory: Curiosity Rover": "Curiosity",
        "Mars Exploration Rovers: Spirit and Opportunity": "Mars Rovers",
        "The Deep Impact Mission": "Deep Impact",
        "Viking Project": "Viking",
        "Catálogo de misiones planetarias": "Misiones"
      };
      const label = aliases[name] || name;
      return label.length > 24 ? `${label.slice(0, 22).trimEnd()}…` : label;
    }

    // Spacecraft labels: preserve the short identifier, remove repeated context.
    if (depth === 2) {
      const code = name.match(/\[[^\]]+\]\s*$/)?.[0] || "";
      let base = name.replace(/\s*\[[^\]]+\]\s*$/, "");
      base = base
        .replace(/^The Apollo /, "Apollo ")
        .replace(/Lunar Surface Experiments Package/gi, "Lunar Experiments")
        .replace(/Command and Service Module/gi, "Command/Service")
        .replace(/Particles and Fields Subsatellite/gi, "Particles Subsat.")
        .replace(/Mars Science Laboratory/gi, "Mars Science Lab")
        .replace(/Spacecraft/gi, "")
        .replace(/Orbiter/gi, "Orbiter")
        .replace(/\s+/g, " ")
        .trim();
      if (base.length > 23) base = `${base.slice(0, 21).trimEnd()}…`;
      return `${base} ${code}`.trim();
    }

    // Instrument labels: use only the most distinctive first words.
    if (name.length <= 22) return name;
    if (/^Apollo 15 /i.test(name)) {
      const cleaned = name.replace(
        /^Apollo 15 (Lunar Surface Experiments Package|Command and Service Module|Lunar Module)\s*/i,
        ""
      );
      const words = cleaned.split(/\s+/);
      return words.length > 3 ? `${words.slice(0, 3).join(" ")}…` : cleaned;
    }
    const words = name.split(/\s+/);
    return words.length > 3 ? `${words.slice(0, 3).join(" ")}…` : name;
  }

  function assignHierarchyDepth(node, depth = 0) {
    node.depth_level = depth;
    
    if (Array.isArray(node.children)) {
      node.children.forEach(child => {
        assignHierarchyDepth(child, depth + 1);
      });
    }
  }
  
  function nodeDepth(node) {
    const depth = node?.data?.depth_level ?? node?.depth_level;

    if (Number.isFinite(depth)) {
      return depth;
    }

    console.log("Nodo sin profundidad reconocida:", node);
    return -1;
  }

  function nodeColorFor(node) {
    const depth = nodeDepth(node);
    if (depth === 0) return COLORS.root;
    if (depth === 1) return COLORS.mission;
    if (depth === 2) return COLORS.spacecraft;
    return COLORS.instrument;
  }

  function isOnSelectedPath(node) {
    if (!selectedNode || !node) return false;
    let current = selectedNode;
    while (current) {
      if (current === node) return true;
      current = current.parent;
    }
    current = node;
    while (current) {
      if (current === selectedNode) return true;
      current = current.parent;
    }
    return false;
  }

  const missionDetails = [
    {
      match: /cassini-huygens/i,
      description: "Misión conjunta de NASA y ESA que estudió Saturno, sus anillos y sus lunas. La sonda Huygens descendió sobre Titán en 2005.",
      image: "https://images-assets.nasa.gov/image/PIA20481/PIA20481~medium.jpg",
      imageAlt: "Saturno y sus anillos observados por Cassini",
      source: "https://images.nasa.gov/details/PIA20481"
    },
    {
      match: /voyager/i,
      description: "Las sondas Voyager 1 y 2 exploraron los planetas gigantes y continúan enviando información desde el espacio interestelar.",
      image: "https://images-assets.nasa.gov/image/PIA00144/PIA00144~medium.jpg",
      imageAlt: "Júpiter fotografiado por Voyager 1",
      source: "https://images.nasa.gov/details/PIA00144"
    },
    {
      match: /viking/i,
      description: "El programa Viking combinó orbitadores y módulos de aterrizaje para estudiar la superficie y la atmósfera de Marte en la década de 1970.",
      image: "https://images-assets.nasa.gov/image/PIA00407/PIA00407~medium.jpg",
      imageAlt: "Vista global de Marte asociada a la exploración Viking",
      source: "https://images.nasa.gov/details/PIA00407"
    },
    {
      match: /apollo 15/i,
      description: "La misión Apollo 15 llevó astronautas a la Luna en 1971 y desplegó experimentos científicos para estudiar el entorno lunar.",
      image: null,
      imageAlt: "",
      source: "https://images.nasa.gov/search?q=Apollo%2015"
    },
    {
      match: /curiosity|mars science laboratory/i,
      description: "El rover Curiosity estudia la geología y la historia ambiental de Marte para investigar si el planeta tuvo condiciones habitables.",
      image: "https://images-assets.nasa.gov/image/PIA22210/PIA22210~medium.jpg",
      imageAlt: "Panorama marciano obtenido por Curiosity",
      source: "https://images.nasa.gov/details/PIA22210"
    }
  ];

  function getMissionAncestor(node) {
    let current = node;
    while (current?.parent && current.parent.parent) current = current.parent;
    return current || node;
  }

  function renderDetails(node) {
    if (!detailCard || !node) return;
    const name = String(node.data?.name || "Elemento sin nombre");
    const depth = nodeDepth(node);
    const level = depth === 0 ? "Raíz del catálogo" : depth === 1 ? "Misión" : depth === 2 ? "Nave espacial" : "Instrumento";
    const mission = getMissionAncestor(node);
    const missionName = String(mission?.data?.name || name);
    const detail = missionDetails.find(item => item.match.test(missionName) || item.match.test(name));
    const childrenCount = Array.isArray(node.children) ? node.children.length : 0;
    const path = typeof node.ancestors === "function"
      ? node.ancestors().reverse().map(item => item.data?.name).filter(Boolean).join(" › ")
      : name;

    detailCard.replaceChildren();
    if (depth === 1 && detail?.image) {
      const img = document.createElement("img");
      img.className = "detail-image";
      img.src = detail.image;
      img.alt = detail.imageAlt;
      img.loading = "lazy";
      img.onerror = () => img.remove();
      detailCard.appendChild(img);
    }
    const kicker = document.createElement("p");
    kicker.className = "detail-kicker";
    kicker.textContent = level;
    const title = document.createElement("h3");
    title.className = "detail-title";
    title.textContent = name;
    detailCard.append(kicker, title);

    const description = document.createElement("p");
    description.className = "detail-description";
    if (depth === 1 && detail) {
      description.textContent = detail.description;
    } else if (depth === 0) {
      description.textContent = "Catálogo de cinco misiones seleccionadas, organizadas por naves espaciales e instrumentos disponibles en los datos.";
    } else if (depth === 2) {
      description.textContent = `Nave perteneciente a la misión ${missionName}. ${childrenCount} instrumentos asociados en esta representación.`;
    } else {
      description.textContent = `Instrumento asociado a la jerarquía de la misión ${missionName}.`;
    }
    detailCard.appendChild(description);

    const meta = document.createElement("p");
    meta.className = "detail-meta";
    meta.textContent = depth < 3 ? `${childrenCount} elemento(s) dependiente(s)` : path;
    detailCard.appendChild(meta);

    if (depth === 1 && detail?.source) {
      const link = document.createElement("a");
      link.className = "detail-link";
      link.href = detail.source;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = "Ver imagen o información de NASA ↗";
      detailCard.appendChild(link);
    }
  }

  try {
    const tree = new hyt.Hypertree(
      { parent: container },
      {
        dataloader: (ok, error) => {
          fetch(DATA_URL)
            .then(response => {
              if (!response.ok) throw new Error(`Error HTTP ${response.status} al cargar ${DATA_URL}`);
              return response.json();
            })
            .then(data => {
              if (!data || !Array.isArray(data.children)) {
                throw new Error("El JSON no tiene la estructura jerárquica esperada.");
              }

               assignHierarchyDepth(data);

               ok(data);
            })
            .catch(err => {
              console.error("Error cargando el JSON:", err);
              status.textContent = `No se pudo cargar ${DATA_URL}. Comprueba que el archivo esté junto a index.html.`;
              if (error) error(err);
            });
        },

        // Etiquetas más breves para reducir solapamientos; data.name conserva el nombre original para búsqueda.
        langInitBFS: (ht, n) => {
          n.precalc.label = compactLabel(n.data?.name, nodeDepth(n));
        },

        filter: { maxlabels: 30 },

        geometry: {
          layerOptions: {
            "nodes": {
              fill: n => {
                console.log(
                  "COLOR:",
                  n.data?.name,
                  "depth:",
                  n.depth,
                  "depth_level:",
                  n.data?.depth_level
                );
              
                const depth = nodeDepth(n);

                if (depth < 3) {
                  console.log(
                    "NODO INTERMEDIO:",
                    n.data?.name,
                    "profundidad:",
                    depth
                  );
                }
              
                if (depth === 0) return "#ff9900";
                if (depth === 1) return "#00ccff";
                if (depth === 2) return "#00cc66";
                return "#cc66ff";
              }
            },
          
            "link-arcs": {
              linkColor: () => COLORS.link
            },
          
            "labels": {
              color: () => COLORS.label
            },
          
            "labels-force": {
              color: () => COLORS.label
            }
          }
        },

        interaction: {
          onNodeClick: (n, m, layer) => {
            selectedNode = n;
            renderDetails(n);
            tree.api.goto(
              { re: -n.layout.z.re, im: -n.layout.z.im },
              null
            ).then(() => layer.view.hypertree.drawDetailFrame());
          }
        }
      }
    );

    homeButton.addEventListener("click", async () => {
      try {
        selectedNode = tree.data;
        renderDetails(tree.data);
        markActiveMission(null);
        await tree.api.gotoHome();
        tree.drawDetailFrame();
        status.textContent = "Vista general: las cinco misiones del catálogo.";
      } catch (err) {
        console.error("Error al volver a la vista general:", err);
        status.textContent = "No se ha podido recuperar la vista general.";
      }
    });

    function markActiveMission(activeButton) {
      if (!missionList) return;
      missionList.querySelectorAll(".mission-button").forEach(button => {
        button.removeAttribute("aria-current");
      });
      if (activeButton) activeButton.setAttribute("aria-current", "true");
    }

    function buildMissionList() {
      if (!missionList || !tree.data || !Array.isArray(tree.data.children)) return;
      missionList.replaceChildren();
      tree.data.children.forEach(missionNode => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "mission-button";
        const marker = document.createElement("span");
        marker.className = "mission-marker";
        marker.setAttribute("aria-hidden", "true");
        const label = document.createElement("span");
        label.className = "mission-name";
        label.textContent = compactLabel(missionNode.data?.name, 1);
        button.append(marker, label);
        button.title = missionNode.data?.name || "Misión";
        button.addEventListener("click", async () => {
          try {
            selectedNode = missionNode;
            renderDetails(missionNode);
            await tree.api.gotoNode(missionNode);
            tree.drawDetailFrame();
            markActiveMission(button);
            status.textContent = `Misión seleccionada: ${missionNode.data.name}`;
          } catch (err) {
            console.error("Error al centrar la misión:", err);
            status.textContent = "No se ha podido centrar esa misión.";
          }
        });
        missionList.appendChild(button);
      });
    }

    tree.initPromise
      .then(() => {
        buildMissionList();
        selectedNode = tree.data;
        renderDetails(tree.data);
        status.textContent = "Catálogo cargado. Selecciona una misión o un nodo para explorar la jerarquía.";
      })
      .catch(err => {
        console.error("Error al inicializar el árbol:", err);
        status.textContent = "No se ha podido inicializar el árbol hiperbólico.";
      });
  } catch (err) {
    console.error(err);
    status.textContent = "Error al crear la visualización. Consulta la consola del navegador.";
  }
})();