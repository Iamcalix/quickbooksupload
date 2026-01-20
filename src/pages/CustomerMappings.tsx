
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Papa from 'papaparse';
import { fetchCustomerMappings, bulkInsertCustomerMappings, CustomerMapping } from '../utils/databaseService';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, ArrowLeft, Upload, Database, CheckCircle, AlertCircle } from "lucide-react";

const CustomerMappings: React.FC = () => {
    const [mappings, setMappings] = useState<CustomerMapping[]>([]);
    const [pasteData, setPasteData] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const loadMappings = async () => {
        const data = await fetchCustomerMappings();
        setMappings(data);
    };

    useEffect(() => {
        loadMappings();
    }, []);

    const handleImport = async () => {
        if (!pasteData.trim()) return;

        setIsProcessing(true);
        setMessage(null);

        try {
            // Parse the pasted data using PapaParse with tab delimiter detection
            // or default comma, but user data looks tab separated
            const parsed = Papa.parse(pasteData, {
                header: true,
                skipEmptyLines: true,
                transformHeader: (h) => h.trim(),
                delimiter: "\t", // Force tab based on sample, or auto
            });

            // If delimiter auto-detection fails to pick tab for that specific format
            if (parsed.meta.delimiter !== '\t' && parsed.data.length > 0 && Object.keys(parsed.data[0]).length < 2) {
                // Fallback to retry with default auto
            }

            console.log('Parsed Data:', parsed);

            const records = parsed.data.map((row: any) => ({
                member_id: row['Member ID'] || row['MemberID'] || '',
                ref_id: row['ReferenceID'] || row['Reference ID'] || null,
                customer_name: row['Client Name'] || row['ClientName'] || null,
                account_number: row['Account Number'] || row['AccountNumber'] || null,
                loan_product: row['Loan Product'] || null,
                email: null,
                phone_number: null
            })).filter((r: any) => r.member_id || r.ref_id);

            if (records.length === 0) {
                setMessage({ type: 'error', text: 'No valid records found. Ensure columns are: Member ID, ReferenceID, Client Name, Account Number' });
                setIsProcessing(false);
                return;
            }

            const { success, error } = await bulkInsertCustomerMappings(records);

            if (success) {
                setMessage({ type: 'success', text: `Successfully imported ${records.length} mappings!` });
                setPasteData('');
                loadMappings();
            } else {
                setMessage({ type: 'error', text: `Import failed: ${error}` });
            }

        } catch (e) {
            setMessage({ type: 'error', text: `Error parsing data: ${e}` });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link to="/" className="p-2 hover:bg-white rounded-full transition-colors">
                            <ArrowLeft className="w-6 h-6 text-gray-600" />
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Customer Mappings</h1>
                            <p className="text-gray-500">Manage customer data for automatic transaction matching</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Import Section */}
                    <Card className="lg:col-span-1 h-fit">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Upload className="w-5 h-5 text-blue-600" />
                                Bulk Import
                            </CardTitle>
                            <CardDescription>
                                Paste your data from Excel/Sheets.
                                <br />
                                Expected columns: <code className="bg-gray-100 px-1 rounded">Account Number</code> <code className="bg-gray-100 px-1 rounded">Client Name</code> <code className="bg-gray-100 px-1 rounded">ReferenceID</code> <code className="bg-gray-100 px-1 rounded">Member ID</code>
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Textarea
                                placeholder="Paste data here..."
                                className="min-h-[200px] font-mono text-sm"
                                value={pasteData}
                                onChange={(e) => setPasteData(e.target.value)}
                            />

                            {message && (
                                <Alert variant={message.type === 'error' ? "destructive" : "default"} className={message.type === 'success' ? "border-green-500 bg-green-50" : ""}>
                                    {message.type === 'success' ? <CheckCircle className="h-4 w-4 text-green-600" /> : <AlertCircle className="h-4 w-4" />}
                                    <AlertTitle>{message.type === 'success' ? 'Success' : 'Error'}</AlertTitle>
                                    <AlertDescription className={message.type === 'success' ? "text-green-700" : ""}>
                                        {message.text}
                                    </AlertDescription>
                                </Alert>
                            )}

                            <Button
                                className="w-full bg-blue-600 hover:bg-blue-700"
                                onClick={handleImport}
                                disabled={isProcessing || !pasteData}
                            >
                                {isProcessing ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Importing...
                                    </>
                                ) : (
                                    'Import Data'
                                )}
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Mappings Table */}
                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Database className="w-5 h-5 text-purple-600" />
                                Existing Mappings
                                <span className="ml-2 text-sm font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                    {mappings.length}
                                </span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Client Name</TableHead>
                                            <TableHead>Member ID</TableHead>
                                            <TableHead>Reference ID</TableHead>
                                            <TableHead>Account No.</TableHead>
                                            <TableHead>Loan Product</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {mappings.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center h-24 text-gray-500">
                                                    No mappings found. Import some data to get started.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            mappings.map((mapping) => (
                                                <TableRow key={mapping.id}>
                                                    <TableCell className="font-medium">{mapping.customer_name || '-'}</TableCell>
                                                    <TableCell className="font-mono text-xs">{mapping.member_id || '-'}</TableCell>
                                                    <TableCell className="font-mono text-xs">{mapping.ref_id || '-'}</TableCell>
                                                    <TableCell className="font-mono text-xs">{mapping.account_number || '-'}</TableCell>
                                                    <TableCell>{mapping.loan_product || '-'}</TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default CustomerMappings;
