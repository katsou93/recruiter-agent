import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q");

    const where: Record<string, unknown> = {};
    if (query) {
      where.OR = [
        { name: { contains: query, mode: "insensitive" } },
        { industry: { contains: query, mode: "insensitive" } },
      ];
    }

    const companies = await prisma.company.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: {
        _count: { select: { jobs: true } },
        jobs: { where: { status: "OPEN" }, select: { id: true, title: true } },
      },
    });

    return NextResponse.json(companies);
  } catch (error) {
    return NextResponse.json({ error: "Fehler beim Laden" }, { status: 500 });
  }
}
