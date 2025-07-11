const functions = require('firebase-functions');
const provinces = require('./provinces');
require('dotenv').config();

exports.mapsLoader = functions.https.onRequest((req, res) => {
  res.redirect(`https://maps.googleapis.com/maps/api/js?key=${process.env.GMAPS_API_KEY}&libraries=places,drawing&callback=initMap`);
});

exports.getProvinces = functions.https.onRequest((req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.json(provinces.getAll());
});