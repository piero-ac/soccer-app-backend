function parseEvents(data) {
	const parsedData = [];
	for (let event of data) {
		parsedData.push({
			...event,
			type: event.detail.includes("Substitution") ? "Substitution" : event.type,
		});
	}

	return parsedData;
}

module.exports = parseEvents;
