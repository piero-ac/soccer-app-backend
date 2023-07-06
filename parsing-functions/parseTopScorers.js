function parseTopScorers(data) {
	const parsedData = [];
	let index = 1;
	for (let player of data) {
		parsedData.push({
			id: player.player.id,
			rank: index++,
			name: player.player.name,
			photoURL: player.player.photo,
			totalGoals: player.statistics[0].goals.total || 0,
			totalAssists: player.statistics[0].goals.assists || 0,
		});
	}
	return parsedData;
}

module.exports = parseTopScorers;
