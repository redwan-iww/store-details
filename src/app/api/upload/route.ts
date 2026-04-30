import { NextRequest, NextResponse } from 'next/server';
import { parseCSV } from '@/lib/csv/parser';
import { CSV_CONFIG, type CSVSource } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const source = formData.get('source') as CSVSource | null;

    if (!file || !source) {
      return NextResponse.json({ error: 'file and source are required' }, { status: 400 });
    }

    if (!CSV_CONFIG[source]) {
      return NextResponse.json({ error: `Invalid source: ${source}` }, { status: 400 });
    }

    const content = await file.text();
    const result = parseCSV(source, content);

    return NextResponse.json({
      source,
      ...result,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Failed to parse CSV' }, { status: 500 });
  }
}