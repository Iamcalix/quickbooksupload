// Excel Export Utility using native browser APIs
import { ParsedTransaction, generateExcelData } from './transactionParser';

// Convert data to CSV format (widely compatible with Excel)
export function generateCSV(transactions: ParsedTransaction[]): string {
  const data = generateExcelData(transactions);
  
  return data.map(row => 
    row.map(cell => {
      // Escape quotes and wrap in quotes if contains comma, quote, or newline
      const cellStr = String(cell || '');
      if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
        return `"${cellStr.replace(/"/g, '""')}"`;
      }
      return cellStr;
    }).join(',')
  ).join('\n');
}

// Generate and download CSV file
export function downloadCSV(transactions: ParsedTransaction[], filename: string = 'transactions'): void {
  const csv = generateCSV(transactions);
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Generate Excel XML format (better Excel compatibility)
export function generateExcelXML(transactions: ParsedTransaction[]): string {
  const data = generateExcelData(transactions);
  
  const escapeXML = (str: string): string => {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  const rows = data.map((row, rowIndex) => {
    const cells = row.map((cell, cellIndex) => {
      const isHeader = rowIndex === 0;
      const isNumber = !isHeader && (cellIndex === 4) && !isNaN(Number(String(cell).replace(/,/g, '')));
      const type = isNumber ? 'Number' : 'String';
      const value = isNumber ? String(cell).replace(/,/g, '') : escapeXML(String(cell || ''));
      
      const style = isHeader ? ' ss:StyleID="Header"' : '';
      
      return `<Cell${style}><Data ss:Type="${type}">${value}</Data></Cell>`;
    }).join('');
    
    return `<Row>${cells}</Row>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles>
    <Style ss:ID="Default">
      <Font ss:FontName="Calibri" ss:Size="11"/>
    </Style>
    <Style ss:ID="Header">
      <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1"/>
      <Interior ss:Color="#1e3a8a" ss:Pattern="Solid"/>
      <Font ss:Color="#FFFFFF"/>
    </Style>
  </Styles>
  <Worksheet ss:Name="Transactions">
    <Table>
      <Column ss:Width="100"/>
      <Column ss:Width="150"/>
      <Column ss:Width="100"/>
      <Column ss:Width="150"/>
      <Column ss:Width="100"/>
      <Column ss:Width="80"/>
      <Column ss:Width="120"/>
      <Column ss:Width="120"/>
      ${rows}
    </Table>
  </Worksheet>
</Workbook>`;
}

// Download Excel XML file
export function downloadExcel(transactions: ParsedTransaction[], filename: string = 'transactions'): void {
  const xml = generateExcelXML(transactions);
  const blob = new Blob([xml], { type: 'application/vnd.ms-excel' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.xls`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Download failed records for review
export function downloadFailedRecords(failed: ParsedTransaction[], filename: string = 'failed_records'): void {
  const content = failed.map((f, i) => 
    `Record ${i + 1}:\n${f.rawLine}\nError: ${f.errorMessage || 'Unknown'}\n${'─'.repeat(50)}`
  ).join('\n\n');
  
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
