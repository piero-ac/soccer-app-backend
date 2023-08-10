function parseMatches(data) {
	const parsedData = [];
	const rounds = new Set();

	for (let match of data) {
		if (!rounds.has(match.league.round)) rounds.add(match.league.round);
		parsedData.push({
			round: match.league.round,
			date: new Date(match.fixture.date).toLocaleDateString("en-US", {
				year: "numeric",
				month: "long",
				day: "numeric",
			}),
			time: getTimeInEST(match.fixture.timestamp),
			dateISOFormat: {
				timezone: match.fixture.timezone,
				ISOString: match.fixture.date,
			},
			id: match.fixture.id,
			homeTeam: { logo: match.teams.home.logo, name: match.teams.home.name },
			awayTeam: { logo: match.teams.away.logo, name: match.teams.away.name },
			score: {
				home: match.score.fulltime.home,
				away: match.score.fulltime.away,
			},
		});
	}

	return { parsedData, rounds: [...rounds] };
}

function getTimeInEST(timestamp) {
	const utcDate = new Date(timestamp * 1000);

	// Convert UTC time to Eastern Standard Time (EST)
	const estOffset = -5 * 60 * 60 * 1000; // EST offset is -5 hours
	const estDate = new Date(utcDate.getTime() + estOffset);

	// Get the hours and minutes in EST
	const estHours = estDate.getUTCHours();
	const estMinutes = estDate.getUTCMinutes();

	// Format the hours and minutes as HH:MM
	const estTime = `${estHours.toString().padStart(2, "0")}:${estMinutes
		.toString()
		.padStart(2, "0")}`;
	return estTime;
}

module.exports = parseMatches;
