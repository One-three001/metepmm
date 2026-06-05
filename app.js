// 1. CONFIGURATION : Votre clé WeatherAPI.com
const WEATHER_API_KEY = "e7a735f3ae4e43acbcf164503262904";

// 2. LISTE DES 10 VILLES
const listePays = [
    { nom: "PORT-AU-PRINCE (HAÏTI)", lat: 18.53, lon: -72.33 },
    { nom: "CAP-HAÏTIEN (HAÏTI)", lat: 19.75, lon: -72.20 },
    { nom: "NEW YORK (USA)", lat: 40.71, lon: -74.00 },
    { nom: "MIAMI (USA)", lat: 25.76, lon: -80.19 },
    { nom: "MONTRÉAL (CANADA)", lat: 45.50, lon: -73.56 },
    { nom: "VANCOUVER (CANADA)", lat: 49.28, lon: -123.12 },
    { nom: "RIO DE JANEIRO (BRÉSIL)", lat: -22.90, lon: -43.17 },
    { nom: "BRASÍLIA (BRÉSIL)", lat: -15.79, lon: -47.88 },
    { nom: "PARIS (FRANCE)", lat: 48.85, lon: 2.35 },
    { nom: "MARSEILLE (FRANCE)", lat: 43.29, lon: 5.36 }
];

// 3. INITIALISATION DU GLOBE
const viewer = new Cesium.Viewer('cesiumContainer', {
    timeline: false,
    animation: false,
    baseLayerPicker: false,
    geocoder: false,
    homeButton: false,
    navigationHelpButton: false,
    sceneModePicker: false,
    baseLayer: new Cesium.ImageryLayer(new Cesium.OpenStreetMapImageryProvider({
        url: 'https://a.tile.openstreetmap.org/'
    }))
});

let indexVilleActuelle = 0;
const donneesMeteoStock = {};

// 4. FONCTION POUR RÉCUPÉRER LA MÉTÉO
function chargerMeteoPourPays(pays) {
    const url = `https://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=${pays.lat},${pays.lon}&lang=fr`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            const temp = Math.round(data.current.temp_c);
            const condition = data.current.condition.text.toUpperCase();
            
            // Sauvegarde complète des données pour le panneau droit
            donneesMeteoStock[pays.nom] = { 
                temp: temp, 
                condition: condition,
                vent: Math.round(data.current.wind_kph),
                humidite: data.current.humidity,
                heure: data.location.localtime.split(" ")[1] || "--:--"
            };
            
            // Premier affichage sur la carte (en mode blanc/normal)
            creerOuMettreAJourPanneau(pays, temp, condition, false);
        })
        .catch(error => console.error(`Erreur météo pour ${pays.nom}:`, error));
}

// 5. CRÉATION / MISE À JOUR DU PANNEAU SUR LE GLOBE (Style Fond Noir + Teinture Bleue)
function creerOuMettreAJourPanneau(pays, temperature, condition, isActive = false) {
    // Si le panneau existe déjà, on le remplace pour changer sa couleur dynamiquement
    const entiteExistante = viewer.entities.getById(pays.nom);
    if (entiteExistante) {
        viewer.entities.remove(entiteExistante);
    }

    const canvas = document.createElement('canvas');
    canvas.width = 240;
    canvas.height = 320;
    const ctx = canvas.getContext('2d');

    // --- LOGIQUE DES COULEURS STYLE FOND NOIR ---
    if (isActive) {
        // Mode Actif : Fond noir profond semi-transparent
        ctx.fillStyle = "rgba(10, 10, 15, 0.85)"; 
        ctx.fillRect(0, 50, 240, 270);

        // En-tête noir opaque avec une fine ligne bleue de séparation
        ctx.fillStyle = "rgba(15, 15, 20, 0.98)";
        ctx.fillRect(0, 0, 240, 50);
        
        // Petite ligne horizontale bleu France 24 sous l'en-tête pour le style
        ctx.fillStyle = "#0099ff";
        ctx.fillRect(0, 48, 240, 2);
    } else {
        // Mode Normal : Fond blanc translucide d'origine
        ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
        ctx.fillRect(0, 50, 240, 270);

        // En-tête blanc opaque
        ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
        ctx.fillRect(0, 0, 240, 50);
    }

    // --- DESSIN DU TEXTE ---
    // Nom de la Ville : Écrit en Bleu Électrique si actif, Noir si normal
    ctx.fillStyle = isActive ? "#0099ff" : "#111111";
    ctx.font = "bold 13px Arial";
    ctx.textAlign = "center";
    ctx.fillText(pays.nom, 120, 32);

    // Température : Écrit en blanc brillant si actif
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 52px Arial";
    ctx.fillText(`${temperature}°C`, 120, 160);

    // Condition météo : Écrit en blanc pur si actif, gris si normal
    ctx.fillStyle = isActive ? "#ffffff" : "#555555";
    ctx.font = "bold 11px Arial";
    ctx.fillText(condition, 120, 240);

    // Ajout final sur le globe Cesium
    viewer.entities.add({
        id: pays.nom,
        position: Cesium.Cartesian3.fromDegrees(pays.lon, pays.lat, 0),
        billboard: {
            image: canvas,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            scale: isActive ? 1.1 : 1.0, 
            disableDepthTestDistance: Number.POSITIVE_INFINITY
        }
    });
}

// --- INTERFACE EXTÉRIEURE : METTRE À JOUR LE PANNEAU DROIT (HTML) ---
function mettreAJourPanneauInfoDroit(pays, infos) {
    const panel = document.getElementById('side-info-panel');
    if (!panel) return;

    const options = { weekday: 'short', day: 'numeric', month: 'short' };
    const dateAujourdhui = new Date().toLocaleDateString('fr-FR', options).toUpperCase().replace('.', '');

    panel.innerHTML = `
        <div class="panel-header">${pays.nom}</div>
        <div class="panel-date">${dateAujourdhui} | LIVE : ${infos.heure}</div>
        <div class="panel-temp">${infos.temp}°C</div>
        <div class="panel-cond">${infos.condition}</div>
        <div class="panel-details">
            <div>VENT: <b>${infos.vent} KM/H</b></div>
            <div>HUMIDITÉ: <b>${infos.humidite}%</b></div>
        </div>
    `;
    panel.style.display = 'block';
}

// Charger les données météo initiales
listePays.forEach(pays => chargerMeteoPourPays(pays));

// 6. LOGIQUE DE TRANSITION AUTOMATIQUE DE LA CAMÉRA (EN BOUCLE)
function faireDefilerMeteo() {
    const panel = document.getElementById('side-info-panel');

    // On remet TOUTES les villes en mode normal (Blanc) avant de traiter la suivante
    listePays.forEach(p => {
        if (donneesMeteoStock[p.nom]) {
            creerOuMettreAJourPanneau(p, donneesMeteoStock[p.nom].temp, donneesMeteoStock[p.nom].condition, false);
        }
    });

    if (indexVilleActuelle >= listePays.length) {
        indexVilleActuelle = 0; 
        
        if (panel) panel.style.display = 'none'; // Masquer le panneau droit pendant le plan large

        // Vue Globale de la Terre
        viewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(-40.0, 25.0, 9000000.0),
            orientation: { heading: Cesium.Math.toRadians(0.0), pitch: Cesium.Math.toRadians(-45.0), roll: 0.0 },
            duration: 4.0 
        });
        
        setTimeout(faireDefilerMeteo, 6000);
        return;
    }

    const ville = listePays[indexVilleActuelle];
    const infos = donneesMeteoStock[ville.nom];

    if (infos) {
        // 1. EFFET 1 : On passe le panneau du globe de la ville actuelle en BLEU
        creerOuMettreAJourPanneau(ville, infos.temp, infos.condition, true);

        // 2. EFFET 2 : On affiche ses détails dans le panneau à droite de l'écran
        if (panel) {
            mettreAJourPanneauInfoDroit(ville, infos);
        }
    }

    // Animation fluide vers la ville actuelle (Centrage optimisé)
    viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(ville.lon, ville.lat - 4.8, 580000.0), 
        orientation: {
            heading: Cesium.Math.toRadians(0.0),
            pitch: Cesium.Math.toRadians(-35.0), 
            roll: 0.0
        },
        duration: 3.5 
    });

    indexVilleActuelle++;
    setTimeout(faireDefilerMeteo, 6500);
}

// Lancer après 3.5 secondes
setTimeout(faireDefilerMeteo, 3500);
