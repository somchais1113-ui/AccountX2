import * as XLSX from 'xlsx';

/**
 * Flexible Parser for Public Company Financial Statements
 * Supports Thai financial statement CSV/Excel with mixed column layouts:
 * - Main account names in col A
 * - Sub-account names in col B or C (indented)
 */

export const STATEMENT_TYPES = {
  balance_sheet: ['งบฐานะการเงิน', 'สินทรัพย์', 'หนี้สินและส่วนของเจ้าของ', 'balance sheet', 'statement of financial position'],
  income_statement: ['งบกำไรขาดทุน', 'งบกำไรขาดทุนเบ็ดเสร็จ', 'income statement', 'statement of comprehensive income', 'profit and loss'],
  cash_flow: ['งบกระแสเงินสด', 'statement of cash flows', 'cash flow'],
  equity_statement: ['งบการเปลี่ยนแปลงส่วนของเจ้าของ', 'statement of changes in equity']
};

export const PERIOD_SCOPES = {
  consolidated: ['งบการเงินรวม', 'รวม', 'consolidated'],
  separate: ['งบเฉพาะกิจการ', 'เฉพาะกิจการ', 'separate']
};

export const CORE_GROUPS = {
  revenue: ['รายได้', 'รายรับ', 'ยอดขาย', 'revenue', 'sales', 'income'],
  cogs: ['ต้นทุนขาย', 'ต้นทุนการให้บริการ', 'cogs', 'cost of goods sold', 'cost of sales'],
  sga: ['ค่าใช้จ่ายในการขาย', 'ค่าใช้จ่ายในการบริหาร', 'sga', 'selling and administrative'],
  expense: ['ค่าใช้จ่าย', 'expense', 'costs'],
  finance_cost: ['ต้นทุนทางการเงิน', 'ดอกเบี้ยจ่าย', 'finance cost', 'interest expense'],
  tax: ['ภาษีเงินได้', 'income tax', 'tax expense'],
  net_profit: ['กำไรสุทธิ', 'ขาดทุนสุทธิ', 'กำไร(ขาดทุน)', 'net profit', 'net loss', 'net income'],
  asset: ['รวมสินทรัพย์', 'สินทรัพย์รวม', 'total assets', 'assets'],
  liability: ['รวมหนี้สิน', 'หนี้สินรวม', 'total liabilities', 'liabilities'],
  equity: ['รวมส่วนของเจ้าของ', 'ส่วนของผู้ถือหุ้น', 'total equity', 'shareholders equity'],
  cash: ['เงินสดและรายการเทียบเท่าเงินสด', 'เงินสด', 'cash and cash equivalents'],
  inventory: ['สินค้าคงเหลือ', 'inventories', 'inventory'],
  receivable: ['ลูกหนี้การค้า', 'trade receivables', 'accounts receivable'],
  payable: ['เจ้าหนี้การค้า', 'trade payables', 'accounts payable'],
  loan: ['เงินกู้ยืม', 'borrowings', 'loans', 'หนี้สินที่มีภาระดอกเบี้ย'],
  operating_cash_flow: ['กระแสเงินสดจากกิจกรรมดำเนินงาน', 'operating activities'],
  investing_cash_flow: ['กระแสเงินสดจากกิจกรรมลงทุน', 'investing activities'],
  financing_cash_flow: ['กระแสเงินสดจากกิจกรรมจัดหาเงิน', 'financing activities']
};

function detectStatementType(text) {
  if (!text) return 'unknown';
  const t = String(text).toLowerCase();
  for (const [key, keywords] of Object.entries(STATEMENT_TYPES)) {
    if (keywords.some(k => t.includes(k))) return key;
  }
  return 'unknown';
}

function detectUnit(text) {
  if (!text) return { unit: 'baht', multiplier: 1 };
  const t = String(text).toLowerCase();
  if (t.includes('ล้านบาท') || t.includes('million')) return { unit: 'million_baht', multiplier: 1000000 };
  if (t.includes('พันบาท') || t.includes('thousand')) return { unit: 'thousand_baht', multiplier: 1000 };
  return { unit: 'baht', multiplier: 1 };
}

function extractPeriodInfo(text) {
  if (!text) return null;
  const t = String(text).toUpperCase().replace(/,/g, '').trim();

  let year = null;
  const yearMatch = t.match(/(?:พ\.ศ\.\s*)?(25[5-9]\d|20[1-3]\d)/);
  if (yearMatch) {
    year = parseInt(yearMatch[1], 10);
  } else {
    const shortMatch = t.match(/ปี\s*([6-9]\d)/) || (t.match(/^([6-9]\d)$/) ? t.match(/^([6-9]\d)$/) : null);
    if (shortMatch) {
      year = 2500 + parseInt(shortMatch[1], 10);
    } else {
      const fyMatch = t.match(/FY\s*([2-9]\d)/);
      if (fyMatch) year = 2000 + parseInt(fyMatch[1], 10);
    }
  }

  if (!year) return null;
  if (year > 2500) year -= 543;

  let period_type = 'FY';
  if (t.includes('Q1') || t.match(/ไตรมาส(ที่)?\s*1/)) period_type = 'Q1';
  else if (t.includes('Q2') || t.match(/ไตรมาส(ที่)?\s*2/)) period_type = 'Q2';
  else if (t.includes('Q3') || t.match(/ไตรมาส(ที่)?\s*3/)) period_type = 'Q3';
  else if (t.includes('Q4') || t.match(/ไตรมาส(ที่)?\s*4/)) period_type = 'Q4';
  else if (t.includes('6M') || t.includes('6 เดือน')) period_type = '6M';
  else if (t.includes('9M') || t.includes('9 เดือน')) period_type = '9M';

  return { year, period_type };
}

function autoMapAccount(accountName) {
  const t = String(accountName).toLowerCase().replace(/\s+/g, '');
  let bestMatch = 'other';
  let confidence = 0.5;

  for (const [group, keywords] of Object.entries(CORE_GROUPS)) {
    for (const keyword of keywords) {
      const kw = keyword.toLowerCase().replace(/\s+/g, '');
      if (t === kw) return { group, confidence: 0.95 };
      if (t.includes(kw)) { bestMatch = group; confidence = 0.75; }
    }
  }
  return { group: bestMatch, confidence };
}

/**
 * FIX: Per-row account name detection.
 * Thai financial statements use col A for main headings and col B/C for
 * indented sub-items. We scan left-to-right per row, skipping value columns,
 * and take the first meaningful text cell as the account name.
 */
function findAccountName(row, yearColSet) {
  for (let c = 0; c < Math.min(row.length, 6); c++) {
    if (yearColSet.has(c)) continue;
    const cell = row[c];
    if (!cell || typeof cell !== 'string') continue;
    const trimmed = cell.trim();
    // Skip very short strings (like note refs "1", "23") and pure numbers
    if (trimmed.length <= 1) continue;
    if (!isNaN(Number(trimmed.replace(/,/g, '')))) continue;
    return trimmed;
  }
  return null;
}

export async function parseFinancialFile(file, companyId) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const results = [];

        for (const sheetName of workbook.SheetNames) {
          const sheet = workbook.Sheets[sheetName];
          const json = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: false });
          if (!json || json.length === 0) continue;

          let currentStatementType = detectStatementType(sheetName);
          let currentScope = 'consolidated';
          let unitInfo = { unit: 'baht', multiplier: 1 };

          const contextRows = Math.min(json.length, 40);
          for (let i = 0; i < contextRows; i++) {
            const row = json[i];
            if (!row) continue;
            const rowText = row.filter(Boolean).join(' ');
            if (currentStatementType === 'unknown') {
              const d = detectStatementType(rowText);
              if (d !== 'unknown') currentStatementType = d;
            }
            const du = detectUnit(rowText);
            if (du.multiplier !== 1) unitInfo = du;
            if (rowText.includes('งบการเงินรวม') || rowText.includes('รวม')) currentScope = 'consolidated';
            else if (rowText.includes('เฉพาะกิจการ')) currentScope = 'separate';
          }

          // Find header row containing year info
          let headerRowIdx = -1;
          let yearColumns = [];

          for (let i = 0; i < contextRows; i++) {
            const row = json[i];
            if (!row) continue;
            for (let j = 0; j < row.length; j++) {
              const p = extractPeriodInfo(row[j]);
              if (p) {
                if (headerRowIdx === -1 || headerRowIdx === i) {
                  headerRowIdx = i;
                  // Avoid duplicate years in same column set
                  if (!yearColumns.some(y => y.year === p.year && y.period_type === p.period_type)) {
                    yearColumns.push({ colIdx: j, year: p.year, period_type: p.period_type });
                  }
                }
              }
            }
            if (headerRowIdx !== -1) break;
          }

          // Fallback: find first row with numeric values and a text label anywhere
          if (headerRowIdx === -1 || yearColumns.length === 0) {
            for (let i = 0; i < contextRows; i++) {
              const row = json[i];
              if (!row) continue;
              let tempCols = [];
              for (let j = 0; j < row.length; j++) {
                const val = String(row[j] || '').replace(/,/g, '').replace(/[()]/g, '');
                if (val && !isNaN(parseFloat(val)) && parseFloat(val) !== 0) {
                  tempCols.push({ colIdx: j, year: new Date().getFullYear() - tempCols.length, period_type: 'FY' });
                }
              }
              const hasLabel = row.some((cell, idx) =>
                idx < 5 && typeof cell === 'string' && cell.trim().length > 1 &&
                isNaN(Number(String(cell).replace(/,/g, '')))
              );
              if (tempCols.length >= 1 && hasLabel) {
                headerRowIdx = i > 0 ? i - 1 : 0;
                yearColumns = tempCols;
                break;
              }
            }
            if (yearColumns.length === 0) {
              console.warn(`No data found in sheet "${sheetName}"`);
              continue;
            }
          }

          const yearColSet = new Set(yearColumns.map(y => y.colIdx));

          // Parse data rows — use per-row account name detection
          for (let i = headerRowIdx + 1; i < json.length; i++) {
            const row = json[i];
            if (!row) continue;

            const rawAccountName = findAccountName(row, yearColSet);
            if (!rawAccountName) continue;

            const mapping = autoMapAccount(rawAccountName);

            for (const { colIdx, year, period_type } of yearColumns) {
              let rawAmount = row[colIdx];
              if (rawAmount === null || rawAmount === undefined || rawAmount === '') continue;

              let isNegative = false;
              let strVal = String(rawAmount).trim();
              if (strVal.startsWith('(') && strVal.endsWith(')')) {
                isNegative = true;
                strVal = strVal.slice(1, -1);
              }
              strVal = strVal.replace(/,/g, '');
              const numericAmount = isNegative ? -Math.abs(parseFloat(strVal)) : parseFloat(strVal);
              if (isNaN(numericAmount)) continue;

              results.push({
                id: crypto.randomUUID(),
                company_id: companyId,
                fiscal_year: year,
                period_type,
                period: period_type,
                statement_scope: currentScope,
                statement_type: currentStatementType !== 'unknown' ? currentStatementType : 'balance_sheet',
                account_name: rawAccountName,
                account_group: mapping.group,
                account_subgroup: null,
                industry_metric: null,
                note: null,
                original_amount: numericAmount,
                original_unit: unitInfo.unit,
                amount: numericAmount * unitInfo.multiplier,
                normalized_unit: 'baht',
                raw_account_name: rawAccountName,
                raw_amount: rawAmount,
                raw_unit: unitInfo.unit,
                source_sheet: sheetName,
                source_row: i + 1,
                source_column: XLSX.utils.encode_col(colIdx),
                mapping_confidence: mapping.confidence,
                needs_review: mapping.confidence < 0.90,
              });
            }
          }
        }
        resolve(results);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}
