// server.js
const express = require("express");
const axios = require("axios");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;
const POKE_API_BASE = process.env.POKE_API_BASE || "https://pokeapi.co/api/v2/pokemon";

app.use(express.json());
app.use(express.static("public")); // sirve /public

// Endpoint de login: /api/v1/auth
app.post("/api/v1/auth", (req, res) => {
  const { email, password } = req.body;
  if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASS) {
    const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: "1h" });
    return res.json({ token });
  }
  return res.status(400).json({ error: "Invalid credentials" });
});

// Middleware de autenticación que responde exactamente "User not authenticated"
function authenticate(req, res, next) {
  const authHeader = req.headers["authorization"] || "";
  const token = authHeader.split(" ")[1];

  if (!authHeader || !token) {
    return res.status(403).json({ error: "User not authenticated" });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: "User not authenticated" });
    }
    req.user = decoded;
    next();
  });
}

// Endpoint protegido EXACTO: /api/v1/pokemonDetails (POST)
app.post("/api/v1/pokemonDetails", authenticate, async (req, res) => {
  const { pokemonName } = req.body;
  if (!pokemonName) {
    // si falta nombre, devolvemos el mensaje pedido
    return res.status(400).json({
      name: "",
      species: "",
      weight: "",
      img_url: "",
      error: "Ups! Pokémon no encontrado"
    });
  }

  try {
    const resp = await axios.get(`${POKE_API_BASE}/${pokemonName.toLowerCase()}`);
    const d = resp.data;

    return res.json({
      name: d.name || "",
      species: (d.species && d.species.name) || "",
      weight: d.weight || "",
      img_url: (d.sprites && d.sprites.front_default) || ""
    });
  } catch (err) {
    // Si la PokeAPI responde 404 -> Pokémon no existe
    if (err.response && err.response.status === 404) {
      return res.status(400).json({
        name: "",
        species: "",
        weight: "",
        img_url: "",
        error: "Ups! Pokémon no encontrado"
      });
    }
    // Otro error interno
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
