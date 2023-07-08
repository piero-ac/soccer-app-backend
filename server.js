require("dotenv").config();
const express = require("express");
const app = express();
const port = 3000;
const axios = require("axios");
const redis = require("redis");
const ONE_DAY = 86400;
const parseStandings = require("./parsing-functions/parseStandings.js");
const parseTopScorers = require("./parsing-functions/parseTopScorers.js");
const parseMatches = require("./parsing-functions/parseMatches.js");
const parseEvents = require("./parsing-functions/parseEvents.js");
const parseStatistics = require("./parsing-functions/parseStatistics.js");

let redisClient;
(async () => {
	redisClient = redis.createClient();

	redisClient.on("error", (error) => console.error(`Error : ${error}`));

	await redisClient.connect();
})();

app.get("/soccer/helloworld", (req, res) => {
	res.json(`Hello World!`);
});

app.get("/soccer/table/:league/:season", async (req, res) => {
	console.log("request to backend for table");
	const { league, season } = req.params;
	const key = `leaguetable-l=${league}-s=${season}`;

	// See if data in redis cache
	const cachedData = await redisClient.get(key);
	if (cachedData) {
		console.log("Table Data in cache");
		return res.json({ data: JSON.parse(cachedData) });
	} else {
		console.log("Table Data not in cache");
		const options = {
			method: "GET",
			url: "https://api-football-v1.p.rapidapi.com/v3/standings",
			params: {
				season: season,
				league: league,
			},
			headers: {
				"X-RapidAPI-Key": process.env.RAPID_API_KEY,
				"X-RapidAPI-Host": "api-football-v1.p.rapidapi.com",
			},
		};

		try {
			const response = await axios.request(options);
			const statusCode = response.status;
			if (statusCode === 200) {
				const data = response.data.response[0].league.standings[0];
				const parsedData = parseStandings(data);
				await redisClient.set(key, JSON.stringify(parsedData), {
					EX: ONE_DAY,
					NX: true,
				});
				return res.json({ data: parsedData });
			} else {
				return res.json({
					error: "Could not obtain standings from API-Football",
				});
			}
		} catch (error) {
			return res.json({ error });
		}
	}
});

app.get("/soccer/topscorers/:league/:season", async (req, res) => {
	console.log("request to backend for topscorers");

	const { league, season } = req.params;
	const options = {
		method: "GET",
		url: "https://api-football-v1.p.rapidapi.com/v3/players/topscorers",
		params: {
			league: league,
			season: season,
		},
		headers: {
			"X-RapidAPI-Key": process.env.RAPID_API_KEY,
			"X-RapidAPI-Host": "api-football-v1.p.rapidapi.com",
		},
	};

	try {
		const response = await axios.request(options);
		const statusCode = response.status;
		if (statusCode === 200) {
			const data = response.data.response;
			const parsedData = parseTopScorers(data);
			return res.json({ data: parsedData });
		} else {
			return res.json({
				error: "Could not obtain top scorers from API-Football",
			});
		}
	} catch (error) {
		return res.json({ error });
	}
});

app.get("/soccer/matches/:league/:season", async (req, res) => {
	console.log("request to backend for matches");

	const { league, season } = req.params;
	const options = {
		method: "GET",
		url: "https://api-football-v1.p.rapidapi.com/v3/fixtures",
		params: {
			league: league,
			season: season,
		},
		headers: {
			"X-RapidAPI-Key": process.env.RAPID_API_KEY,
			"X-RapidAPI-Host": "api-football-v1.p.rapidapi.com",
		},
	};

	try {
		const response = await axios.request(options);
		const statusCode = response.status;
		if (statusCode === 200) {
			const data = response.data.response;
			const { parsedData, rounds } = parseMatches(data);
			return res.json({ data: { matches: parsedData, rounds } });
		} else {
			return res.json({
				error: "Could not obtain matches from API-Football",
			});
		}
	} catch (error) {
		return res.json({ error });
	}
});

app.get("/soccer/match/:id/events", async (req, res) => {
	console.log("request to backend for match events");

	const { id } = req.params;
	const options = {
		method: "GET",
		url: "https://api-football-v1.p.rapidapi.com/v3/fixtures/events",
		params: { fixture: id },
		headers: {
			"X-RapidAPI-Key": process.env.RAPID_API_KEY,
			"X-RapidAPI-Host": "api-football-v1.p.rapidapi.com",
		},
	};

	try {
		const response = await axios.request(options);
		const statusCode = response.status;
		if (statusCode === 200) {
			const data = response.data.response;
			const parsedData = parseEvents(data);
			return res.json({ data: parsedData });
		} else {
			return res.json({
				error: "Could not obtain match events from API-Football",
			});
		}
	} catch (error) {
		return res.json({ error });
	}
});

app.get("/soccer/match/:id/stats", async (req, res) => {
	console.log("request to backend for match statistics");

	const { id } = req.params;
	const options = {
		method: "GET",
		url: "https://api-football-v1.p.rapidapi.com/v3/fixtures/statistics",
		params: { fixture: id },
		headers: {
			"X-RapidAPI-Key": process.env.RAPID_API_KEY,
			"X-RapidAPI-Host": "api-football-v1.p.rapidapi.com",
		},
	};

	try {
		const response = await axios.request(options);
		const statusCode = response.status;
		if (statusCode === 200) {
			const data = response.data.response;
			const parsedData = parseStatistics(data);
			return res.json({ data: parsedData });
		} else {
			return res.json({
				error: "Could not obtain match statistics from API-Football",
			});
		}
	} catch (error) {
		return res.json({ error });
	}
});

app.get("/soccer/match/:id/lineups", async (req, res) => {
	console.log("request to backend for match lineups");

	const { id } = req.params;
	const options = {
		method: "GET",
		url: "https://api-football-v1.p.rapidapi.com/v3/fixtures/lineups",
		params: { fixture: id },
		headers: {
			"X-RapidAPI-Key": process.env.RAPID_API_KEY,
			"X-RapidAPI-Host": "api-football-v1.p.rapidapi.com",
		},
	};

	try {
		const response = await axios.request(options);
		const statusCode = response.status;
		if (statusCode === 200) {
			const [team1, team2] = response.data.response;
			return res.json({ data: { team1, team2 } }); // no parsing for lineups
		} else {
			return res.json({
				error: "Could not obtain match lineups from API-Football",
			});
		}
	} catch (error) {
		return res.json({ error });
	}
});

app.listen(port, () => {
	console.log(`Example app listening on port ${port}`);
});
