import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const query = searchParams.get("q");

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (query) {
      where.OR = [
        { firstName: { contains: query, mode: "insensitive" } },
        { lastName: { contains: query, mode: "insensitive" } },
        { currentTitle: { contains: query, mode: "insensitive" } },
        { currentCompany: { contains: query, mode: "insensitive" } },
      ];
    }

    const candidates = await prisma.candidate.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { outreaches: true } } },
    });

    return NextResponse.json(candidates);
  } catch (error) {
    return NextResponse.json({ error: "Fehler beim Laden" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID fehlt" }, { status: 400 });

    await prisma.candidate.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Fehler beim Löschen" }, { status: 500 });
  }
}
