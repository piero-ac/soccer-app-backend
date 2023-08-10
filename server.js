require("dotenv").config();
const express = require("express");
const app = express();
const port = process.env.PORT || 3000;
const axios = require("axios");
const redis = require("redis");
const cors = require("cors");
const ONE_DAY = 86400;
const parseStandings = require("./parsing-functions/parseStandings.js");
const parseTopScorers = require("./parsing-functions/parseTopScorers.js");
const {
	parseMatches,
	filterMatchesByDate,
} = require("./parsing-functions/parseMatches.js");
const msToMidnightUTC = require("./parsing-functions/timeFunctions.js");
const parseEvents = require("./parsing-functions/parseEvents.js");
const parseStatistics = require("./parsing-functions/parseStatistics.js");

// for production
// let redisClient;
// (async () => {
// 	const url = process.env.REDIS_URI;
// 	redisClient = redis.createClient({ url });

// 	redisClient.on("error", (error) => console.error(`Error : ${error}`));

// 	await redisClient.connect();
// })();

// for local dev
let redisClient;
(async () => {
	redisClient = redis.createClient();

	redisClient.on("error", (error) => console.error(`Error : ${error}`));

	await redisClient.connect();
})();

app.use(cors());

// app.get("/soccer/helloworld", (req, res) => {
// 	res.json(`Hello World!`);
// });

// Route for obtaining the standings for the specified league and season
app.get("/soccer/table/:league/:season", async (req, res) => {
	console.log("request to backend for table");
	const { league, season } = req.params;
	const key = `leaguetable-l=${league}-s=${season}`;

	// See if data in redis cache
	const cachedData = await redisClient.get(key);
	if (cachedData) {
		console.log("TABLE DATA in cache");

		// Get the remaining TTL in ms
		const ttl = (await redisClient.ttl(key)) * 1000;

		return res
			.status(200)
			.json({ data: JSON.parse(cachedData), expiration: ttl });
	} else {
		console.log("TABLE DATA not in cache");
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
				const expirationTime = msToMidnightUTC();
				const data = response.data.response[0].league.standings[0];
				const parsedData = parseStandings(data);
				await redisClient.set(key, JSON.stringify(parsedData), {
					PX: expirationTime,
					NX: true,
				});
				return res
					.status(200)
					.json({ data: parsedData, expiration: expirationTime });
			} else {
				return res.status(500).json({
					error: "Could not obtain standings from API-Football",
				});
			}
		} catch (error) {
			return res.status(500).json({ error });
		}
	}
});

/// Route for obtaining the top scorers for the specified league and season
app.get("/soccer/topscorers/:league/:season", async (req, res) => {
	console.log("request to backend for topscorers");
	const { league, season } = req.params;
	const key = `topScorers-l=${league}-s=${season}`;

	// See if data in redis cache
	const cachedData = await redisClient.get(key);
	if (cachedData) {
		console.log("Top Scorers Data in cache");
		return res.status(200).json({ data: JSON.parse(cachedData) });
	} else {
		console.log("Top Scorers Data not in cache");
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
				await redisClient.set(key, JSON.stringify(parsedData), {
					EX: ONE_DAY,
					NX: true,
				});
				return res.status(200).json({ data: parsedData });
			} else {
				return res.status(500).json({
					error: "Could not obtain top scorers from API-Football",
				});
			}
		} catch (error) {
			return res.status(500).json({ error });
		}
	}
});

// Route for obtaining the matches for a specified league and season
app.get("/soccer/matches/:league/:season", async (req, res) => {
	console.log("request to backend for matches");
	const { league, season } = req.params;
	const matchesKey = `leaguematches-l=${league}-s=${season}`;
	const roundsKey = `leaguerounds-l=${league}-s=${season}`;

	const cachedMatchesData = await redisClient.get(matchesKey);
	const cachedRoundsData = await redisClient.get(roundsKey);

	if (cachedMatchesData) {
		console.log("MATCHES DATA in cache");
		// Get the remaining TTL in ms
		const ttl = (await redisClient.ttl(matchesKey)) * 1000;
		return res.status(200).json({
			data: {
				matches: JSON.parse(cachedMatchesData),
				rounds: JSON.parse(cachedRoundsData),
			},
			expiration: ttl,
		});
	} else {
		console.log("Matches Data not in cache");
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
				const expirationTime = msToMidnightUTC();
				const data = response.data.response;
				const { parsedData, rounds } = parseMatches(data);
				await redisClient.set(matchesKey, JSON.stringify(parsedData), {
					PX: expirationTime,
					NX: true,
				});
				await redisClient.set(roundsKey, JSON.stringify(rounds), {
					PX: expirationTime,
					NX: true,
				});
				return res.status(200).json({
					data: { matches: parsedData, rounds },
					expiration: expirationTime,
				});
			} else {
				return res.status(500).json({
					error: "Could not obtain matches from API-Football",
				});
			}
		} catch (error) {
			return res.status(500).json({ error });
		}
	}
});

// Route for obtaining the match events for the specified match id
app.get("/soccer/match/:id/events", async (req, res) => {
	console.log("request to backend for match events");
	const { id } = req.params;
	const key = `events-mid=${id}`;

	// See if data in redis cache
	const cachedData = await redisClient.get(key);
	if (cachedData) {
		console.log("Match Events Data in cache");
		return res.status(200).json({ data: JSON.parse(cachedData) });
	} else {
		console.log("Match Events Data not in cache");
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
				await redisClient.set(key, JSON.stringify(parsedData), {
					EX: ONE_DAY,
					NX: true,
				});
				return res.status(200).json({ data: parsedData });
			} else {
				return res.status(500).json({
					error: "Could not obtain match events from API-Football",
				});
			}
		} catch (error) {
			return res.status(500).json({ error });
		}
	}
});

// Route for obtaining the match statistics for the specified match id
app.get("/soccer/match/:id/stats", async (req, res) => {
	console.log("request to backend for match statistics");
	const { id } = req.params;
	const key = `stats-mid=${id}`;

	// See if data in redis cache
	const cachedData = await redisClient.get(key);
	if (cachedData) {
		console.log("Match Stats Data in cache");
		return res.status(200).json({ data: JSON.parse(cachedData) });
	} else {
		console.log("Match Stats Data not in cache");
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
				await redisClient.set(key, JSON.stringify(parsedData), {
					EX: ONE_DAY,
					NX: true,
				});
				return res.status(200).json({ data: parsedData });
			} else {
				return res.status(500).json({
					error: "Could not obtain match statistics from API-Football",
				});
			}
		} catch (error) {
			return res.status(500).json({ error });
		}
	}
});

// Route for obtaining the match lineups for the specified match id
app.get("/soccer/match/:id/lineups", async (req, res) => {
	console.log("request to backend for match lineups");
	const { id } = req.params;
	const key = `lineups-mid=${id}`;

	// See if data in redis cache
	const cachedData = await redisClient.get(key);
	if (cachedData) {
		console.log("Match lineups data in cache");
		return res.status(200).json({ data: JSON.parse(cachedData) });
	} else {
		console.log("Match lineups data not in cache");
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
				await redisClient.set(key, JSON.stringify({ team1, team2 }), {
					EX: ONE_DAY,
					NX: true,
				});
				return res.status(200).json({ data: { team1, team2 } }); // no parsing for lineups
			} else {
				return res.status(500).json({
					error: "Could not obtain match lineups from API-Football",
				});
			}
		} catch (error) {
			return res.status(500).json({ error });
		}
	}
});

// // Route for obtaining the matches for a specified league, season, and date
// // Uses the 'hopefully' already cached matches data
// app.get("/soccer/matches/:league/:season/:date", async (req, res) => {
// 	console.log("request to backend for matches by date");
// 	const { league, season, date } = req.params;
// 	const matchesKey = `leaguematches-l=${league}-s=${season}`;
// 	const roundsKey = `leaguerounds-l=${league}-s=${season}`;

// 	const cachedMatchesData = await redisClient.get(matchesKey);
// 	const cachedRoundsData = await redisClient.get(roundsKey);

// 	if (cachedMatchesData) {
// 		console.log("Matches Data in cache");

// 		// Get the remaining TTL in ms
// 		const ttl = (await redisClient.ttl(matchesKey)) * 1000;

// 		// Find the matches for the specified date
// 		const matches = JSON.parse(cachedMatchesData);
// 		const filteredMatches = filterMatchesByDate(matches, date);

// 		return res.status(200).json({
// 			data: {
// 				matches: filteredMatches,
// 				expiration: ttl,
// 			},
// 		});
// 	} else {
// 		console.log("Matches Data not in cache");
// 		const options = {
// 			method: "GET",
// 			url: "https://api-football-v1.p.rapidapi.com/v3/fixtures",
// 			params: {
// 				league: league,
// 				season: season,
// 			},
// 			headers: {
// 				"X-RapidAPI-Key": process.env.RAPID_API_KEY,
// 				"X-RapidAPI-Host": "api-football-v1.p.rapidapi.com",
// 			},
// 		};

// 		try {
// 			const response = await axios.request(options);
// 			const statusCode = response.status;

// 			if (statusCode === 200) {
// 				const expirationTime = msToMidnightUTC();
// 				const data = response.data.response;
// 				const { parsedData, rounds } = parseMatches(data);

// 				// Save data in cache
// 				await redisClient.set(matchesKey, JSON.stringify(parsedData), {
// 					PX: expirationTime,
// 					NX: true,
// 				});
// 				await redisClient.set(roundsKey, JSON.stringify(rounds), {
// 					PX: expirationTime,
// 					NX: true,
// 				});

// 				// Find the matches for the specified date
// 				const matches = parsedData;
// 				const filteredMatches = filterMatchesByDate(matches, date);
// 				return res
// 					.status(200)
// 					.json({
// 						data: { matches: filteredMatches, all: parsedData, expiration: expirationTime },
// 					});
// 			} else {
// 				return res.status(500).json({
// 					error: "Could not obtain matches from API-Football",
// 				});
// 			}
// 		} catch (error) {
// 			return res.status(500).json({ error });
// 		}
// 	}
// });

app.listen(port, () => {
	console.log(`Example app listening on port ${port}`);
});
