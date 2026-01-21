
const nmbSample = "20  Jan 2026	20  Jan 2026		101 - NMB Head Office - Cash Deposit Agency banking - 2001 12 17 35 agency @22410063786@TPS900 Trx ID PS2085594242  Ter ID 2245105627   Description 963330000141!! From SAVCOM LIMITED COLLECTION ACC => VITUS VICENT ITABA	101AGD126020A4OE	12500.00		TZS 3826000.00";

const crdbSample = "20.01.2026 13:59:00	 REF:19bdb0f42ad57818 AGENCY FT FROM FANUEL JALISON MKUPALA TO FRANKAB17689067684357947257:HASSAN SAIDI NGUNDE:963330000396 N/A	 20.01.2026 00:00:00	 0.00	 12,500.00	 437,129,784.78";

// NMB Regex from transactionParser.ts
// const userIdPattern = /@(\d+)@/;
const nmbRegex = /@(\d+)@/;
const nmbMatch = nmbSample.match(nmbRegex);
console.log("NMB Match:", nmbMatch ? nmbMatch[1] : "No match");

// CRDB Regex from transactionParser.ts
// const refPattern = /REF:([a-zA-Z0-9]+)/;
const crdbRegex = /REF:([a-zA-Z0-9]+)/;
const crdbMatch = crdbSample.match(crdbRegex);
console.log("CRDB Match:", crdbMatch ? crdbMatch[1] : "No match");
