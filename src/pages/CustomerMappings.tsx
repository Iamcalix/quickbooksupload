
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
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

    const processParsedData = async (data: any[]) => {
        if (data.length > 0) {
            console.log('first row keys:', Object.keys(data[0]));
            console.log('first row sample:', data[0]);
        }
        const records = data.map((row: any) => ({
            member_id: (row['Member ID'] || row['MemberID'] || '').trim(),
            ref_id: (row['ReferenceID'] || row['Reference ID'] || '').trim() || null,
            customer_name: (row['Client Name'] || row['ClientName'] || '').trim() || null,
            national_id: (row['National ID Number'] || row['National ID'] || row['NationalID'] || '').trim() || null,
            account_number: (row['Account Number'] || row['AccountNumber'] || '').trim() || null,
            loan_product: (row['Loan Product'] || '').trim() || null,
            email: null,
            phone_number: null
        })).filter((r: any) => r.member_id || r.ref_id || r.national_id);

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
            // Reset file input if possible, but for now just clear processing
        } else {
            setMessage({ type: 'error', text: `Import failed: ${error}` });
        }
        setIsProcessing(false);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsProcessing(true);
        setMessage(null);

        try {
            if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                const buffer = await file.arrayBuffer();
                const workbook = XLSX.read(buffer);
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet);
                await processParsedData(jsonData);
            } else {
                // CSV or other text formats
                Papa.parse(file, {
                    header: true,
                    skipEmptyLines: true,
                    transformHeader: (h) => h.trim(),
                    complete: async (results) => {
                        await processParsedData(results.data);
                    },
                    error: (error) => {
                        setMessage({ type: 'error', text: `Error parsing file: ${error.message}` });
                        setIsProcessing(false);
                    }
                });
            }
        } catch (error) {
            setMessage({ type: 'error', text: `Error reading file: ${error}` });
            setIsProcessing(false);
        }
    };

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

            await processParsedData(parsed.data);

        } catch (e) {
            setMessage({ type: 'error', text: `Error parsing data: ${e}` });
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
                                Expected columns: <code className="bg-gray-100 px-1 rounded">Account Number</code> <code className="bg-gray-100 px-1 rounded">Client Name</code> <code className="bg-gray-100 px-1 rounded">ReferenceID</code> <code className="bg-gray-100 px-1 rounded">Member ID</code> <code className="bg-gray-100 px-1 rounded">National ID Number</code>
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Upload CSV/Excel File</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="file"
                                        accept=".csv, .txt, .tsv, .xlsx, .xls"
                                        onChange={handleFileUpload}
                                        className="block w-full text-sm text-gray-500
                                            file:mr-4 file:py-2 file:px-4
                                            file:rounded-md file:border-0
                                            file:text-sm file:font-semibold
                                            file:bg-blue-50 file:text-blue-700
                                            hover:file:bg-blue-100
                                        "
                                        disabled={isProcessing}
                                    />
                                </div>
                            </div>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-white px-2 text-gray-500">Or paste text</span>
                                </div>
                            </div>

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
                                    'Import Pasted Data'
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
                                            <TableHead>National ID</TableHead>
                                            <TableHead>Account No.</TableHead>
                                            <TableHead>Loan Product</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {mappings.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center h-24 text-gray-500">
                                                    No mappings found. Import some data to get started.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            mappings.map((mapping) => (
                                                <TableRow key={mapping.id}>
                                                    <TableCell className="font-medium">{mapping.customer_name || '-'}</TableCell>
                                                    <TableCell className="font-mono text-xs">{mapping.member_id || '-'}</TableCell>
                                                    <TableCell className="font-mono text-xs">{mapping.ref_id || '-'}</TableCell>
                                                    <TableCell className="font-mono text-xs">{mapping.national_id || '-'}</TableCell>
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
