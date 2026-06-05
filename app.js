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

// 3. INITIALISATION DU GLOBE EN MODE SATELLITE
const viewer = new Cesium.Viewer('cesiumContainer', {
    timeline: false,
    animation: false,
    baseLayerPicker: false,
    geocoder: false,
    homeButton: false,
    navigationHelpButton: false,
    sceneModePicker: false,
    // --- CHANGEMENT ICI : Activation de la couche satellite de Cesium Ion ---
    baseLayer: Cesium.ImageryLayer.fromProviderAsync(
        Cesium.IonImageryProvider.fromAssetId(2) // Asset 2 correspond à l'imagerie satellite "Bing Maps Aerial"
    )
});

let indexVilleActuelle = 0;
const donneesMeteoStock = {};

// 4. FONCTION POUR RÉCUPÉRER LA MÉTÉO (Stockage)
function chargerMeteoPourPays(pays) {
    const url = `https://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=${pays.lat},${pays.lon}&lang=fr`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            donneesMeteoStock[pays.nom] = { 
                temp: Math.round(data.current.temp_c), 
                condition: data.current.condition.text.toUpperCase(),
                vent: Math.round(data.current.wind_kph),
                humidite: data.current.humidity,
                heure: data.location.localtime.split(" ")[1] || "--:--"
            };
        })
        .catch(error => console.error(`Erreur météo pour ${pays.nom}:`, error));
}

// 5. CRÉATION DU PANNEAU LORSQUE LA VILLE EST ZOOMÉE
function creerPanneauActif(pays, temperature, condition) {
    const canvas = document.createElement('canvas');
    canvas.width = 240;
    canvas.height = 320;
    const ctx = canvas.getContext('2d');

    // Fond noir transparent style "Studio TV"
    ctx.fillStyle = "rgba(10, 10, 15, 0.85)"; 
    ctx.fillRect(0, 50, 240, 270);

    // En-tête sombre
    ctx.fillStyle = "rgba(15, 15, 20, 0.98)";
    ctx.fillRect(0, 0, 240, 50);
    
    // Bandeau bleu
    ctx.fillStyle = "#0099ff";
    ctx.fillRect(0, 48, 240, 2);

    // Nom de la Ville
    ctx.fillStyle = "#0099ff";
    ctx.font = "bold 13px Arial";
    ctx.textAlign = "center";
    ctx.fillText(pays.nom, 120, 32);

    // Température
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 52px Arial";
    ctx.fillText(`${temperature}°C`, 120, 160);

    // Condition
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 11px Arial";
    ctx.fillText(condition, 120, 240);

    // Injecter le panneau sur le globe satellite
    viewer.entities.add({
        id: pays.nom,
        position: Cesium.Cartesian3.fromDegrees(pays.lon, pays.lat, 0),
        billboard: {
            image: canvas,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            scale: 1.1, 
            disableDepthTestDistance: Number.POSITIVE_INFINITY
        }
    });
}

// PANNEAU HTML (DROIT)
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

// Lancer la récupération des données
listePays.forEach(pays => chargerMeteoPourPays(pays));

// 6. ANIMATION ET POP-IN DES PANNEAUX
function faireDefilerMeteo() {
    const panel = document.getElementById('side-info-panel');

    // On efface le panneau de la ville précédente pour garder la vue satellite clean pendant le vol
    viewer.entities.removeAll();

    if (indexVilleActuelle >= listePays.length) {
        indexVilleActuelle = 0; 
        if (panel) panel.style.display = 'none';

        // Retour à la vue spatiale globale
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

    // Décollage de la caméra
    viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(ville.lon, ville.lat - 4.8, 580000.0), 
        orientation: {
            heading: Cesium.Math.toRadians(0.0),
            pitch: Cesium.Math.toRadians(-35.0), 
            roll: 0.0
        },
        duration: 3.5 
    });

    // EFFET : Les panneaux apparaissent précisément à la fin du zoom (3,5 secondes)
    setTimeout(() => {
        if (infos) {
            creerPanneauActif(ville, infos.temp, infos.condition);
            mettreAJourPanneauInfoDroit(ville, infos);
        }
    }, 3500);

    indexVilleActuelle++;
    setTimeout(faireDefilerMeteo, 7000);
}

// Démarrage initial après 3.5 secondes de contemplation de la Terre depuis l'espace
setTimeout(faireDefilerMeteo, 3500);
