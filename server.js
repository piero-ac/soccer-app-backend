const express = require("express");
const app = express();
const port = 3000;

app.get("/soccer/helloworld", (req, res) => {
	res.json("Hello World!");
});

app.get("/soccer/table/:league/:season", async (req, res) => {});

app.get("/soccer/topscorers/:league/:season", async (req, res) => {});

app.get("/soccer/matches/:league/:season", async (req, res) => {});

app.get("/soccer/match/:id/events", async (req, res) => {});

app.get("/soccer/match/:id/stats", async (req, res) => {});

app.get("/soccer/match/:id/lineups", async (req, res) => {});

app.listen(port, () => {
	console.log(`Example app listening on port ${port}`);
});
