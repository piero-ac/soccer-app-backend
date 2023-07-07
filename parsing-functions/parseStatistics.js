function parseStatistics(data) {
	const parsedData = [];
	const [team1, team2] = data;
	const team1Stats = team1.statistics,
		team2Stats = team2.statistics;
	for (let i = 0; i < team1Stats.length; i++) {
		const type = team1Stats[i].type
			.split(" ")
			.map((word) => word[0].toUpperCase() + word.substring(1))
			.join(" ");
		parsedData.push({
			type,
			hVal: team1Stats[i].value || 0,
			aVal: team2Stats[i].value || 0,
		});
	}
	return parsedData;
}

module.exports = parseStatistics;
