import { ForbiddenException, Injectable } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { jwtAuthorize } from "./jwtAuthorize";
import { AdminPayload } from "../../decorators/payload/AdminPayload";

const prisma = new PrismaClient();

export async function adminAuthorize(request: {
  headers: { authorization?: string };
}): Promise<AdminPayload> {
  const payload: AdminPayload = jwtAuthorize({ request }) as AdminPayload;

  if (payload.type !== "admin") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  const session = await prisma.ecommerce_mall_admin_sessions.findFirst({
    where: {
      id: payload.session_id,
      ecommerce_mall_admin_id: payload.id,
      expired_at: {
        gt: new Date(),
      },
    },
  });

  if (session === null) {
    throw new ForbiddenException("Session expired or invalid");
  }

  const admin = await prisma.ecommerce_mall_admins.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
    },
  });

  if (admin === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}