export default function parseStandings(data) {
	const parsedData = [];
	for (let team of data) {
		parsedData.push({
			teamId: team.team.id,
			teamRank: team.rank,
			teamName: team.team.name,
			totalGamesPlayed: team.all.played,
			totalGamesWon: team.all.win,
			totalGamesDraw: team.all.draw,
			totalGamesLose: team.all.lose,
			totalGoalsFor: team.all.goals.for,
			totalGoalsAgainst: team.all.goals.against,
			totalGoalsDiff: team.goalsDiff,
			totalPoints: team.points,
			teamForm: team.form,
			teamLogo: team.team.logo,
		});
	}

	return parsedData;
}
