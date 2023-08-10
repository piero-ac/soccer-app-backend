function msToMidnightUTC() {
	// Calculate time left until midnight UTC
	const currentDate = new Date();
	const midnightUTC = new Date(
		currentDate.getUTCFullYear(),
		currentDate.getUTCMonth(),
		currentDate.getUTCDate() + 1,
		0, // Midnight
		0,
		0,
		0
	);

	const timeLeftSeconds = midnightUTC - currentDate;

	return timeLeftSeconds;
}

module.exports = msToMidnightUTC;
