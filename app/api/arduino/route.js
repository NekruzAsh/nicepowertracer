import { NextResponse } from 'next/server';
import { Device } from '../../utils/powerCalculations.js';

// In-memory storage for devices (replace with DB later)
let devices = [];

export async function GET() {
  try {
    return NextResponse.json({ devices: devices.map(d => d.toJSON()) });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const text = await request.text();
    console.log('Raw body:', text);
    let data;
    try {
      data = JSON.parse(text);
    } catch (jsonError) {
      try {
        // Try parsing as loose JSON with single quotes
        data = JSON.parse(text.replace(/'/g, '"'));
      } catch (looseJsonError) {
        // Try parsing as form data
        const params = new URLSearchParams(text);
        data = {
          id: params.get('id'),
          current: params.get('current')
        };
      }
    }
    const { id, current } = data;

    if (id === undefined) {
        console.log(id);
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    let currentNum = 0;
    if (current !== undefined) {
      currentNum = parseFloat(current);
      if (isNaN(currentNum) || currentNum < 0) {
        return NextResponse.json({ error: "current must be a non-negative number" }, { status: 400 });
      }
    }

    console.log(`Device ${id} → ${currentNum} A`);

    // Store or update device
    let device = devices.find(d => d.id === id);
    if (device) {
      device.updateCurrent(currentNum);
    } else {
      device = new Device(id, currentNum);
      devices.push(device);
    }

    // TODO: persist to DB, emit via WebSocket, etc.

    return NextResponse.json({ status: "ok", received: { id, current: currentNum } });
  } catch (error) {
    console.error(error);

    if (error instanceof SyntaxError || error?.name === 'SyntaxError') {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}