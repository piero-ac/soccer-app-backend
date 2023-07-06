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

module.exports = parseMatches;
