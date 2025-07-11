const provinceData = {
  // ILOCOS REGION
  "Ilocos Norte": {
    geoJson: {
      "type": "Feature",
      "properties": { "name": "Ilocos Norte" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [120.7065,18.5049],[120.9888,18.5049],
          [120.9888,18.1976],[120.7065,18.1976],
          [120.7065,18.5049]
        ]]
      }
    },
    color: "#D33B3B",
    jobs: 2100,
    center: { lat: 18.1667, lng: 120.7500 }
  },
  "Ilocos Sur": {
    geoJson: {
      "type": "Feature",
      "properties": { "name": "Ilocos Sur" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [120.3476,17.9045],[120.6887,17.9045],
          [120.6887,16.9987],[120.3476,16.9987],
          [120.3476,17.9045]
        ]]
      }
    },
    color: "#D33B3B",
    jobs: 1800,
    center: { lat: 17.5833, lng: 120.3833 }
  },
  "La Union": {
    geoJson: {
      "type": "Feature",
      "properties": { "name": "La Union" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [120.2918,16.9287],[120.5589,16.9287],
          [120.5589,16.2987],[120.2918,16.2987],
          [120.2918,16.9287]
        ]]
      }
    },
    color: "#D3733B",
    jobs: 1500,
    center: { lat: 16.5000, lng: 120.4167 }
  },
  "Pangasinan": {
    geoJson: {
      "type": "Feature",
      "properties": { "name": "Pangasinan" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [119.8845,16.3987],[120.5589,16.3987],
          [120.5589,15.5987],[119.8845,15.5987],
          [119.8845,16.3987]
        ]]
      }
    },
    color: "#D33B3B",
    jobs: 2200,
    center: { lat: 15.9167, lng: 120.3333 }
  },

  // CAGAYAN VALLEY
  "Batanes": {
    geoJson: {
      "type": "Feature",
      "properties": { "name": "Batanes" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [121.7589,20.7087],[122.0589,20.7087],
          [122.0589,20.1987],[121.7589,20.1987],
          [121.7589,20.7087]
        ]]
      }
    },
    color: "#7FD33B",
    jobs: 300,
    center: { lat: 20.4167, lng: 121.9500 }
  },
  "Cagayan": {
    geoJson: {
      "type": "Feature",
      "properties": { "name": "Cagayan" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [121.1589,18.5087],[122.3589,18.5087],
          [122.3589,17.2987],[121.1589,17.2987],
          [121.1589,18.5087]
        ]]
      }
    },
    color: "#D3733B",
    jobs: 1200,
    center: { lat: 17.6167, lng: 121.7167 }
  },
  "Isabela": {
    geoJson: {
      "type": "Feature",
      "properties": { "name": "Isabela" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [121.4589,17.5087],[122.3589,17.5087],
          [122.3589,16.2987],[121.4589,16.2987],
          [121.4589,17.5087]
        ]]
      }
    },
    color: "#FFEA05",
    jobs: 800,
    center: { lat: 16.9833, lng: 121.6167 }
  },
  "Nueva Vizcaya": {
    geoJson: {
      "type": "Feature",
      "properties": { "name": "Nueva Vizcaya" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [120.8589,16.6087],[121.4589,16.6087],
          [121.4589,15.9987],[120.8589,15.9987],
          [120.8589,16.6087]
        ]]
      }
    },
    color: "#7FD33B",
    jobs: 400,
    center: { lat: 16.4833, lng: 121.1333 }
  },
  "Quirino": {
    geoJson: {
      "type": "Feature",
      "properties": { "name": "Quirino" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [121.2589,16.5087],[121.7589,16.5087],
          [121.7589,15.9987],[121.2589,15.9987],
          [121.2589,16.5087]
        ]]
      }
    },
    color: "#7FD33B",
    jobs: 350,
    center: { lat: 16.2833, lng: 121.5833 }
  },

  // CORDILLERA ADMINISTRATIVE REGION
  "Abra": {
    geoJson: {
      "type": "Feature",
      "properties": { "name": "Abra" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [120.5589,17.9087],[121.0589,17.9087],
          [121.0589,17.2987],[120.5589,17.2987],
          [120.5589,17.9087]
        ]]
      }
    },
    color: "#FFEA05",
    jobs: 600,
    center: { lat: 17.5833, lng: 120.7500 }
  },
  "Apayao": {
    geoJson: {
      "type": "Feature",
      "properties": { "name": "Apayao" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [120.9589,18.5087],[121.3589,18.5087],
          [121.3589,17.7987],[120.9589,17.7987],
          [120.9589,18.5087]
        ]]
      }
    },
    color: "#7FD33B",
    jobs: 200,
    center: { lat: 18.0167, lng: 121.1667 }
  },
  "Benguet": {
    geoJson: {
      "type": "Feature",
      "properties": { "name": "Benguet" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [120.4589,16.9087],[120.9589,16.9087],
          [120.9589,16.1987],[120.4589,16.1987],
          [120.4589,16.9087]
        ]]
      }
    },
    color: "#D3733B",
    jobs: 1100,
    center: { lat: 16.4167, lng: 120.5833 }
  },
  "Ifugao": {
    geoJson: {
      "type": "Feature",
      "properties": { "name": "Ifugao" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [120.9589,16.9087],[121.3589,16.9087],
          [121.3589,16.4987],[120.9589,16.4987],
          [120.9589,16.9087]
        ]]
      }
    },
    color: "#7FD33B",
    jobs: 250,
    center: { lat: 16.8333, lng: 121.1667 }
  },
  "Kalinga": {
    geoJson: {
      "type": "Feature",
      "properties": { "name": "Kalinga" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [121.0589,17.9087],[121.4589,17.9087],
          [121.4589,17.2987],[121.0589,17.2987],
          [121.0589,17.9087]
        ]]
      }
    },
    color: "#7FD33B",
    jobs: 300,
    center: { lat: 17.4167, lng: 121.2500 }
  },
  "Mountain Province": {
    geoJson: {
      "type": "Feature",
      "properties": { "name": "Mountain Province" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [120.8589,17.2087],[121.2589,17.2087],
          [121.2589,16.8987],[120.8589,16.8987],
          [120.8589,17.2087]
        ]]
      }
    },
    color: "#7FD33B",
    jobs: 180,
    center: { lat: 17.0833, lng: 121.0000 }
  },

  // CENTRAL LUZON
  "Aurora": {
    geoJson: {
      "type": "Feature",
      "properties": { "name": "Aurora" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [121.2589,16.3087],[122.0589,16.3087],
          [122.0589,15.4987],[121.2589,15.4987],
          [121.2589,16.3087]
        ]]
      }
    },
    color: "#7FD33B",
    jobs: 350,
    center: { lat: 15.7500, lng: 121.5000 }
  },
  "Bataan": {
    geoJson: {
      "type": "Feature",
      "properties": { "name": "Bataan" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [120.4589,14.4276],[120.5534,14.4276],
          [120.5534,14.8443],[120.4589,14.8443],
          [120.4589,14.4276]
        ]]
      }
    },
    color: "#D33B3B",
    jobs: 1900,
    center: { lat: 14.6667, lng: 120.4167 }
  },
  "Bulacan": {
    geoJson: {
      "type": "Feature",
      "properties": { "name": "Bulacan" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [120.7589,15.2087],[121.1589,15.2087],
          [121.1589,14.6987],[120.7589,14.6987],
          [120.7589,15.2087]
        ]]
      }
    },
    color: "#D33B3B",
    jobs: 2300,
    center: { lat: 14.9167, lng: 120.8833 }
  },
  "Nueva Ecija": {
    geoJson: {
      "type": "Feature",
      "properties": { "name": "Nueva Ecija" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [120.7589,16.0087],[121.2589,16.0087],
          [121.2589,15.1987],[120.7589,15.1987],
          [120.7589,16.0087]
        ]]
      }
    },
    color: "#D3733B",
    jobs: 1500,
    center: { lat: 15.5833, lng: 120.9167 }
  },
  "Pampanga": {
    geoJson: {
      "type": "Feature",
      "properties": { "name": "Pampanga" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [120.4589,15.2087],[120.8589,15.2087],
          [120.8589,14.7987],[120.4589,14.7987],
          [120.4589,15.2087]
        ]]
      }
    },
    color: "#D33B3B",
    jobs: 2100,
    center: { lat: 15.0667, lng: 120.6667 }
  },
  "Tarlac": {
    geoJson: {
      "type": "Feature",
      "properties": { "name": "Tarlac" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [120.3589,15.7087],[120.7589,15.7087],
          [120.7589,15.1987],[120.3589,15.1987],
          [120.3589,15.7087]
        ]]
      }
    },
    color: "#D3733B",
    jobs: 1200,
    center: { lat: 15.4833, lng: 120.5833 }
  },
  "Zambales": {
    geoJson: {
      "type": "Feature",
      "properties": { "name": "Zambales" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [119.9589,15.7087],[120.4589,15.7087],
          [120.4589,14.7987],[119.9589,14.7987],
          [119.9589,15.7087]
        ]]
      }
    },
    color: "#FFEA05",
    jobs: 700,
    center: { lat: 15.3333, lng: 120.1667 }
  }
};

module.exports = {
  getAll: () => Object.values(provinceData)
};