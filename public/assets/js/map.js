// Initialize Firebase (make sure you've included Firebase SDK in your HTML)
if (!firebase.apps.length) {
  firebase.initializeApp({
    apiKey: "AIzaSyCM1QSKbZH9Ih3RHv39nQipYoti8Yrji_M",
    authDomain: "careerstep-bpsu1.firebaseapp.com",
    projectId: "careerstep-bpsu1"
  });
}

// Get Firebase Function URLs dynamically
const MAPS_LOADER_URL = `https://us-central1-${firebase.app().options.projectId}.cloudfunctions.net/mapsLoader`;
const PROVINCES_API = `https://us-central1-${firebase.app().options.projectId}.cloudfunctions.net/getProvinces`;

let map;
const provinceLayers = {};

// Main initialization function
function initMap() {
  map = new google.maps.Map(document.getElementById("northLuzonMap"), {
    center: { lat: 16.5, lng: 121 }, // Centered on North Luzon
    zoom: 7,
    disableDefaultUI: true,
    gestureHandling: "greedy",
    styles: [
      {
        featureType: "administrative.province",
        elementType: "labels",
        stylers: [{ visibility: "off" }] // Hide default province labels
      },
      {
        featureType: "administrative.province",
        elementType: "geometry",
        stylers: [{ visibility: "off" }] // Hide province boundaries
      }
    ]
  });

  loadProvinces();
  setupSearch();
  setupStats();
}

// Load province data from Firebase Function
async function loadProvinces() {
  try {
    const response = await fetch(PROVINCES_API);
    const provinces = await response.json();
    
    provinces.forEach(province => {
      // Just add the label
      addProvinceLabel(province);
    });
    
    // Set initial view to North Luzon
    const northLuzonBounds = new google.maps.LatLngBounds(
      new google.maps.LatLng(14.0, 119.5), // SW corner
      new google.maps.LatLng(21.0, 122.5)  // NE corner
    );
    map.fitBounds(northLuzonBounds);
    
  } catch (error) {
    console.error("Error loading provinces:", error);
    showError("Failed to load province data. Please refresh the page.");
  }
}


function addProvinceLabel(province) {
  new google.maps.Marker({
    position: province.center,
    map: map,
    icon: {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
        `<svg width="120" height="24" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="${province.color}" rx="4" opacity="0.8"/>
          <text x="50%" y="16" font-family="Arial" font-size="12" 
                font-weight="bold" text-anchor="middle" fill="white">
            ${province.geoJson.properties.name}
          </text>
        </svg>`
      )}`,
      anchor: new google.maps.Point(60, 12)
    },
    zIndex: 999,
    optimized: false
  });
}

function highlightProvince(name, provinceData) {
  // Update stats when a province is clicked
  if (provinceData) {
    document.getElementById('totalActiveJobs').textContent = 
      provinceData.jobs.toLocaleString();
    document.getElementById('topJobMarket').textContent = name;
    
    // Center map on the province
    map.panTo(provinceData.center);
    map.setZoom(9); // Zoom in a bit more when selecting a province
  }
}

function setupSearch() {
  const searchInput = document.getElementById('provinceSearch');
  const searchBox = new google.maps.places.SearchBox(searchInput, {
    types: ['(regions)'],
    componentRestrictions: { country: 'ph' }
  });

  searchBox.addListener('places_changed', () => {
    const places = searchBox.getPlaces();
    if (places.length > 0) {
      const place = places[0];
      const provinceName = place.name.replace(' Province', '');
      highlightProvince(provinceName);
    }
  });
}

function setupStats() {
  // Add click handlers for your stat cards if needed
  document.querySelectorAll('.stat-card').forEach(card => {
    card.addEventListener('click', () => {
      // Example: Filter provinces by job count
      const minJobs = parseInt(card.dataset.minJobs);
      highlightProvincesByJobCount(minJobs);
    });
  });
}

function fitMapToProvinces() {
  const bounds = new google.maps.LatLngBounds();
  Object.values(provinceLayers).forEach(layer => {
    layer.forEach(feature => {
      feature.getGeometry().forEachLatLng(latLng => {
        bounds.extend(latLng);
      });
    });
  });
  
  if (!bounds.isEmpty()) {
    // Add some padding and set max zoom level
    map.fitBounds(bounds, { 
      padding: 50,
      maxZoom: 8 // Adjust this value as needed
    });
  }
}

function showError(message) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'map-error';
  errorDiv.innerHTML = `
    <i class="fas fa-exclamation-triangle"></i>
    <span>${message}</span>
  `;
  document.getElementById('northLuzonMap').appendChild(errorDiv);
}

// Make initMap available globally
window.initMap = initMap;