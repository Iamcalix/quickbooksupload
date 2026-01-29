// Customer Mapping Service - Fetch and manage customer data from Google Sheets

export interface CustomerMapping {
    memberId: string;        // Namba ya usajili (e.g., MC241EPW)
    customerName: string;    // Jina la mteja
    phoneNumber: string;     // Namba ya Simu
    transactionNumber: string; // Namba za Miamala
}

const GOOGLE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1UAsaVoPF4Vp2AakivI_qv7-dXfUqIXAIlKijYWG0KmA/export?format=csv';
const CACHE_KEY = 'customer_mappings_cache';
const CACHE_EXPIRY_KEY = 'customer_mappings_cache_expiry';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

/**
 * Parse CSV data into CustomerMapping objects
 */
function parseCSV(csvText: string): CustomerMapping[] {
    const lines = csvText.trim().split('\n');
    const mappings: CustomerMapping[] = [];

    // Skip header row (index 0)
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Split by comma, handling potential quoted fields
        const parts = line.split(',');
        if (parts.length >= 4) {
            mappings.push({
                memberId: parts[0].trim(),
                customerName: parts[1].trim(),
                phoneNumber: parts[2].trim(),
                transactionNumber: parts[3].trim()
            });
        }
    }

    return mappings;
}

/**
 * Fetch customer mappings from Google Sheets
 */
export async function fetchCustomerMappings(forceRefresh: boolean = false): Promise<CustomerMapping[]> {
    // Check cache first
    if (!forceRefresh) {
        const cached = getCachedMappings();
        if (cached) {
            console.log('[CustomerMapping] Using cached data');
            return cached;
        }
    }

    try {
        console.log('[CustomerMapping] Fetching from Google Sheets...');
        const response = await fetch(GOOGLE_SHEET_URL);

        if (!response.ok) {
            throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
        }

        const csvText = await response.text();
        const mappings = parseCSV(csvText);

        // Cache the results
        cacheMappings(mappings);

        console.log(`[CustomerMapping] Fetched ${mappings.length} customer mappings`);
        return mappings;
    } catch (error) {
        console.error('[CustomerMapping] Error fetching mappings:', error);

        // Try to return cached data even if expired
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            console.log('[CustomerMapping] Using expired cache due to fetch error');
            return JSON.parse(cached);
        }

        return [];
    }
}

/**
 * Get cached mappings if available and not expired
 */
function getCachedMappings(): CustomerMapping[] | null {
    const cached = localStorage.getItem(CACHE_KEY);
    const expiry = localStorage.getItem(CACHE_EXPIRY_KEY);

    if (!cached || !expiry) {
        return null;
    }

    const expiryTime = parseInt(expiry, 10);
    if (Date.now() > expiryTime) {
        // Cache expired
        return null;
    }

    return JSON.parse(cached);
}

/**
 * Cache mappings in localStorage
 */
function cacheMappings(mappings: CustomerMapping[]): void {
    const expiryTime = Date.now() + CACHE_DURATION;
    localStorage.setItem(CACHE_KEY, JSON.stringify(mappings));
    localStorage.setItem(CACHE_EXPIRY_KEY, expiryTime.toString());
}

/**
 * Find customer name by Member ID
 */
export function findCustomerByMemberId(
    memberId: string,
    mappings: CustomerMapping[]
): string {
    const mapping = mappings.find(m => m.memberId === memberId);
    return mapping ? mapping.customerName : '';
}

/**
 * Find customer name by transaction number
 */
export function findCustomerByTransactionNumber(
    transactionNumber: string,
    mappings: CustomerMapping[]
): string {
    const mapping = mappings.find(m => m.transactionNumber === transactionNumber);
    return mapping ? mapping.customerName : '';
}

/**
 * Extract Member ID from NMB transaction description
 * Pattern: MC###XXX (e.g., MC241EPW, MC236EPW)
 */
export function extractMemberIdFromDescription(description: string): string {
    const match = description.match(/\b(MC\d{3}[A-Z]{3})\b/i);
    return match ? match[1].toUpperCase() : '';
}

/**
 * Clear cached mappings
 */
export function clearMappingsCache(): void {
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CACHE_EXPIRY_KEY);
    console.log('[CustomerMapping] Cache cleared');
}
