import { ForbiddenException, Module, Global } from "@nestjs/common";
import { jwtAuthorize } from "./jwtAuthorize";
import { SuperadminPayload } from "../../decorators/payload/SuperadminPayload";

// Direct Prisma Client import to avoid MyGlobal dependency issues
import { PrismaClient } from "@prisma/client";

export async function superadminAuthorize(request: {
  headers: { authorization?: string };
}): Promise<SuperadminPayload> {
  const payload: SuperadminPayload = jwtAuthorize({ request }) as SuperadminPayload;

  if (payload.type !== "super_admin") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // Use PrismaClient directly to avoid MyGlobal import issues
  const prisma = new PrismaClient();
  
  const superadmin = await prisma.ecommerce_mall_super_admins.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
    },
  });

  if (superadmin === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}