import { jsPDF } from 'jspdf';

const SOCIETY_NAME = 'Sakar Palace - B';
const PROJECT_NAME = 'Sakar Buildcon';
const SOCIETY_ADDRESS =
  'Sakar Palace - B, Nivrutti Nagar, Opp to Jatra Hotel, Adgaon Shivar, 422003';

const MONTHS = {
  jan: { index: 0, name: 'January' },
  feb: { index: 1, name: 'February' },
  mar: { index: 2, name: 'March' },
  apr: { index: 3, name: 'April' },
  may: { index: 4, name: 'May' },
  jun: { index: 5, name: 'June' },
  jul: { index: 6, name: 'July' },
  aug: { index: 7, name: 'August' },
  sep: { index: 8, name: 'September' },
  oct: { index: 9, name: 'October' },
  nov: { index: 10, name: 'November' },
  dec: { index: 11, name: 'December' }
};

const pad = (value) => String(value).padStart(2, '0');

const parseReceiptMonth = (monthKey) => {
  const match = String(monthKey || '').trim().toLowerCase().match(/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[- ]?(\d{2})$/);
  if (!match) return null;

  const shortMonth = match[1];
  const yy = Number(match[2]);
  const monthMeta = MONTHS[shortMonth];

  if (!monthMeta) return null;

  const fullYear = 2000 + yy;
  const monthNumber = monthMeta.index + 1;

  return {
    fullYear,
    monthNumber,
    monthName: monthMeta.name,
    monthLabel: `${monthMeta.name} ${fullYear}`,
    compactMonth: `${fullYear}${pad(monthNumber)}`
  };
};

const sanitizeFlatNo = (flatNo) => String(flatNo || '').replace(/\s+/g, '').replace('-', '').toUpperCase();

const buildReceiptNo = (monthKey, flatNo) => {
  const parsed = parseReceiptMonth(monthKey);
  if (!parsed) return `SPB-${new Date().getFullYear()}-${sanitizeFlatNo(flatNo)}`;
  return `SPB-${parsed.compactMonth}-${sanitizeFlatNo(flatNo)}`;
};

const formatToday = () =>
  new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  }).format(new Date());

const formatAmount = (value) => {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return '0';
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(amount);
};

const centerText = (doc, text, y, options = {}) => {
  const width = doc.internal.pageSize.getWidth();
  doc.text(text, width / 2, y, { align: 'center', ...options });
};

const line = (doc, y, marginX) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.line(marginX, y, pageWidth - marginX, y);
};

export const downloadMaintenanceReceipt = ({
  monthKey,
  flatNo,
  residentName,
  amount,
  contactNo,
  paymentMode = 'Cash'
}) => {
  const parsedMonth = parseReceiptMonth(monthKey);
  if (!parsedMonth) {
    throw new Error('Invalid receipt month selected.');
  }

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 46;

  doc.setDrawColor(198, 210, 226);
  doc.setLineWidth(1);
  doc.rect(28, 28, pageWidth - 56, pageHeight - 56);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(33, 44, 60);

  let y = 72;
  doc.setFontSize(17);
  centerText(doc, SOCIETY_NAME, y);
  y += 20;

  doc.setFontSize(11);
  centerText(doc, PROJECT_NAME, y);
  y += 18;

  const addressLines = doc.splitTextToSize(`Address: ${SOCIETY_ADDRESS}`, pageWidth - margin * 2);
  doc.text(addressLines, pageWidth / 2, y, { align: 'center' });
  y += addressLines.length * 13 + 10;

  line(doc, y, margin);
  y += 24;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  centerText(doc, 'MAINTENANCE RECEIPT', y);
  y += 18;
  doc.setFont('helvetica', 'normal');

  line(doc, y, margin);
  y += 24;

  doc.setFontSize(12);
  doc.text(`Receipt No: ${buildReceiptNo(monthKey, flatNo)}`, margin, y);
  doc.text(`Date: ${formatToday()}`, pageWidth - margin, y, { align: 'right' });

  y += 20;
  line(doc, y, margin);

  y += 26;
  doc.setFont('helvetica', 'bold');
  doc.text('Resident Details', margin, y);
  doc.setFont('helvetica', 'normal');

  y += 22;
  doc.text(`Name: ${residentName || '-'}`, margin, y);
  y += 18;
  doc.text(`Flat No: ${flatNo || '-'}`, margin, y);
  y += 18;
  doc.text(`Address: ${SOCIETY_NAME}`, margin, y);

  y += 18;
  const addressBodyLines = doc.splitTextToSize(SOCIETY_ADDRESS, pageWidth - margin * 2 - 48);
  doc.text(addressBodyLines, margin + 48, y);
  y += addressBodyLines.length * 13;

  y += 8;
  doc.text(`Contact No: ${contactNo || '-'}`, margin, y);

  y += 22;
  line(doc, y, margin);

  y += 26;
  doc.setFont('helvetica', 'bold');
  doc.text('Maintenance Details', margin, y);
  doc.setFont('helvetica', 'normal');

  y += 22;
  doc.text(`Month: ${parsedMonth.monthLabel}`, margin, y);

  y += 22;
  doc.setFont('helvetica', 'bold');
  doc.text(`Maintenance Amount: Rs. ${formatAmount(amount)}`, margin, y);
  doc.setFont('helvetica', 'normal');

  y += 22;
  line(doc, y, margin);

  y += 26;
  doc.setFont('helvetica', 'bold');
  doc.text(`Payment Mode: ${paymentMode}`, margin, y);

  y += 22;
  line(doc, y, margin);

  y += 30;
  doc.setTextColor(34, 109, 71);
  doc.setFontSize(18);
  centerText(doc, 'Status: PAID', y);
  doc.setTextColor(33, 44, 60);

  y += 18;
  line(doc, y, margin);

  y += 28;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(14);
  centerText(doc, 'Thank you for your payment!', y);

  y += 24;
  doc.setFont('helvetica', 'bold');
  centerText(doc, `For ${SOCIETY_NAME}`, y);

  const parsedFlatNo = sanitizeFlatNo(flatNo);
  const filename = `Maintenance-Receipt-${buildReceiptNo(monthKey, parsedFlatNo)}.pdf`;
  doc.save(filename);
};

export const getReadableReceiptMonth = (monthKey) => {
  const parsed = parseReceiptMonth(monthKey);
  return parsed?.monthLabel || monthKey;
};

export const isMonthPaid = (row, monthKey) => Number(row?.months?.[monthKey] || 0) > 0;
