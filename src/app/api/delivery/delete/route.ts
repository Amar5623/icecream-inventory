// src/app/api/delivery/delete/route.ts
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import DeliveryPartner from "@/models/DeliveryPartner";

/**
 * DELETE /api/delivery/delete
 * body: { partnerId, userId?, adminId?, adminEmail? }
 *
 * Authorization same as update route.
 * Performs a deleteOne and returns partnerId on success.
 */
export async function DELETE(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { partnerId, userId, adminId, adminEmail: adminEmailRaw } = body ?? {};

    if (!partnerId) return NextResponse.json({ error: "partnerId required" }, { status: 400 });

    if (!userId && !adminId && !adminEmailRaw && !process.env.NEXT_PUBLIC_ADMIN_EMAIL && !process.env.NEXT_PUBLIC_ADMIN_ID) {
      return NextResponse.json({ error: "userId or adminId or adminEmail required for authorization" }, { status: 400 });
    }

    await connectDB();

    const partner = await DeliveryPartner.findById(String(partnerId));
    if (!partner) return NextResponse.json({ error: "Partner not found" }, { status: 404 });

    const providedAdminEmail = adminEmailRaw ? String(adminEmailRaw).toLowerCase() : null;
    const partnerAdminEmail = partner.adminEmail ? String(partner.adminEmail).toLowerCase() : null;

    const envAdminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL ? String(process.env.NEXT_PUBLIC_ADMIN_EMAIL).toLowerCase() : null;
    const envAdminId = process.env.NEXT_PUBLIC_ADMIN_ID ? String(process.env.NEXT_PUBLIC_ADMIN_ID) : null;

    const createdByUserVal = partner.createdByUser ? String(partner.createdByUser) : null;

    const okByOwner = userId && createdByUserVal && String(userId) === String(createdByUserVal);
    const okByAdminIdMatchesOwner = adminId && createdByUserVal && String(adminId) === String(createdByUserVal);
    const okByAdminEmail = providedAdminEmail && partnerAdminEmail && providedAdminEmail === partnerAdminEmail;
    const okByEnvAdminEmail = envAdminEmail && (providedAdminEmail === envAdminEmail || partnerAdminEmail === envAdminEmail);
    const okByEnvAdminId = envAdminId && adminId && String(adminId) === String(envAdminId);
    const okByAdminIdGlobal = envAdminId && adminId && String(adminId) === String(envAdminId);

    if (!okByOwner && !okByAdminIdMatchesOwner && !okByAdminEmail && !okByEnvAdminEmail && !okByEnvAdminId && !okByAdminIdGlobal) {
      return NextResponse.json({ error: "Not authorized to delete this partner" }, { status: 403 });
    }

    await DeliveryPartner.deleteOne({ _id: partner._id });

    return NextResponse.json({ message: "Partner deleted", partnerId: String(partner._id) }, { status: 200 });
  } catch (err: any) {
    console.error("DELETE /api/delivery/delete error:", err);
    return NextResponse.json({ error: "Failed to delete partner", details: err?.message ?? String(err) }, { status: 500 });
  }
}
