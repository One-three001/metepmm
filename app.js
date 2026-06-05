// 1. CONFIGURATION : Clés d'accès
Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI0YjkwZWExMy1lN2Y4LTQ1ZWEtYjA1My00NDBiNjk1NmI3YmYiLCJpZCI6NDQwNTMyLCJpc3MiOiJodHRwczovL2FwaS5jZXNpdW0uY29tIiwiYXVkIjoidW5kZWZpbmVkX2RlZmF1bHQiLCJpYXQiOjE3ODA2MjE0MjB9.SOxpqIJR2f_l8RjtgpQudhJ_K_eFk3R3EqQ6ZYbgFi8';
const WEATHER_API_KEY = "e7a735f3ae4e43acbcf164503262904";

// 2. LISTE DES 10 VILLES
const listePays = [
    { nom: "PORT-AU-PRINCE (HAÏTI)", lat: 18.53, lon: -72.33 },
    { nom: "GRAND-ANSE (HAÏTI)", lat: 18.64, lon: -74.11 },
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

// --- DÉMARRAGE IMMÉDIAT SUR PORT-AU-PRINCE ---
const premiereVille = listePays[0]; 
viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(premiereVille.lon, premiereVille.lat - 4.8, 580000.0),
    orientation: {
        heading: Cesium.Math.toRadians(0.0),
        pitch: Cesium.Math.toRadians(-35.0),
        roll: 0.0
    }
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
            
            donneesMeteoStock[pays.nom] = { 
                temp: temp, 
                condition: condition,
                vent: Math.round(data.current.wind_kph),
                humidite: data.current.humidity,
                heure: data.location.localtime.split(" ")[1] || "--:--"
            };
            
            creerOuMettreAJourPanneau(pays, temp, condition, false);
        })
        .catch(error => console.error(`Erreur météo pour ${pays.nom}:`, error));
}

// 5. CRÉATION / MISE À JOUR DU PANNEAU SUR LE GLOBE
function creerOuMettreAJourPanneau(pays, temperature, condition, isActive = false) {
    const entiteExistante = viewer.entities.getById(pays.nom);
    if (entiteExistante) {
        viewer.entities.remove(entiteExistante);
    }

    const canvas = document.createElement('canvas');
    canvas.width = 240;
    canvas.height = 320;
    const ctx = canvas.getContext('2d');

    if (isActive) {
        ctx.fillStyle = "rgba(10, 10, 15, 0.85)"; 
        ctx.fillRect(0, 50, 240, 270);
        ctx.fillStyle = "rgba(15, 15, 20, 0.98)";
        ctx.fillRect(0, 0, 240, 50);
        ctx.fillStyle = "#0099ff";
        ctx.fillRect(0, 48, 240, 2);
    } else {
        ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
        ctx.fillRect(0, 50, 240, 270);
        ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
        ctx.fillRect(0, 0, 240, 50);
    }

    ctx.fillStyle = isActive ? "#0099ff" : "#111111";
    ctx.font = "bold 13px Arial";
    ctx.textAlign = "center";
    ctx.fillText(pays.nom, 120, 32);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 52px Arial";
    ctx.fillText(`${temperature}°C`, 120, 160);

    ctx.fillStyle = isActive ? "#ffffff" : "#555555";
    ctx.font = "bold 11px Arial";
    ctx.fillText(condition, 120, 240);

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

// INTERFACE EXTÉRIEURE : PANNEAU DROIT
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

    listePays.forEach(p => {
        if (donneesMeteoStock[p.nom]) {
            creerOuMettreAJourPanneau(p, donneesMeteoStock[p.nom].temp, donneesMeteoStock[p.nom].condition, false);
        }
    });

    if (indexVilleActuelle >= listePays.length) {
        indexVilleActuelle = 0; 
        if (panel) panel.style.display = 'none';

        // Vue Globale de la Terre (uniquement à la fin du tour complet)
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
        creerOuMettreAJourPanneau(ville, infos.temp, infos.condition, true);
        if (panel) {
            mettreAJourPanneauInfoDroit(ville, infos);
        }
    }

    // Le zoom sur Port-au-Prince au début sera instantané car la caméra y est déjà
    viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(ville.lon, ville.lat - 4.8, 580000.0), 
        orientation: {
            heading: Cesium.Math.toRadians(0.0),
            pitch: Cesium.Math.toRadians(-35.0), 
            roll: 0.0
        },
        duration: indexVilleActuelle === 0 ? 0.2 : 3.5
    });

    indexVilleActuelle++;
    setTimeout(faireDefilerMeteo, 6500);
}

// Lancement rapide pour appliquer les données sur Port-au-Prince dès le départ
setTimeout(faireDefilerMeteo, 400);
