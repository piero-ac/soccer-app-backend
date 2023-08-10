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
			dateForMatching: convertToYYYYMMDD(match.fixture.date),
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

	// Set the time zone offset for EST, including daylight saving time (DST) adjustment
	const estOffset = -5 * 60 + (utcDate.getTimezoneOffset() < 300 ? 60 : 0);
	const estDate = new Date(utcDate.getTime() + estOffset * 60 * 1000);

	// Get the hours and minutes in EST
	const estHours = estDate.getUTCHours();
	const estMinutes = estDate.getUTCMinutes();

	// Format the hours and minutes as HH:MM
	const estTime = `${estHours.toString().padStart(2, "0")}:${estMinutes
		.toString()
		.padStart(2, "0")}`;
	return estTime;
}

function filterMatchesByDate(data, targetDate) {
	const filteredMatches = [];

	for (let match of data) {
		if (match.dateForMatching === targetDate) {
			filteredMatches.push(match);
		}
	}

	return filteredMatches;
}

function convertToYYYYMMDD(dateString) {
	const date = new Date(dateString);

	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");

	const formattedDate = `${year}-${month}-${day}`;
	return formattedDate;
}

module.exports = { parseMatches, filterMatchesByDate };
