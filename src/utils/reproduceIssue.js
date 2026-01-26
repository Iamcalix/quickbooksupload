
const mappings = [
    { studentName: "IDRISA SHABANI NAMANGAYA", national_id: "MC868FLL" },
    { studentName: "TEST CASE 2 - SPACED", national_id: "MC 868 FLL" },
];

const transactions = [
    {
        rawLine: "20  Jan 2026	20  Jan 2026		101 - NMB Head Office - Cash Deposit Agency banking - 2001 13 10 54 agency @24210042557@TPS900 Trx ID PS2085696066  Ter ID 2425120716   Description MC868FLL!! From SAVCOM LIMITED COLLECTION ACC => RIZIKI ZABLON AYO	101AGD126020A6UF	37500.00		TZS 3888500.00",
        description: "Standard Case"
    },
    {
        rawLine: "... Description MC 868 FLL!! ...",
        description: "Space in transaction"
    }
];

console.log("--- Starting Matching Reproduction ---");

transactions.forEach((t, i) => {
    console.log(`\nTransaction ${i + 1}: ${t.description}`);
    console.log(`Raw: ${t.rawLine}`);

    // Logic copied from AppLayout.tsx
    const normalizedRaw = t.rawLine.toLowerCase().replace(/\s+/g, '');
    console.log(`Normalized Raw: ${normalizedRaw}`);

    mappings.forEach(m => {
        if (m.national_id) {
            const normalizedId = m.national_id.toLowerCase().replace(/\s+/g, '');
            console.log(`  Checking Mapping: ${m.studentName} (ID: ${m.national_id}) -> Norm ID: ${normalizedId}`);

            const isMatch = normalizedRaw.includes(normalizedId);
            console.log(`  Match? ${isMatch}`);
        }
    });
});
