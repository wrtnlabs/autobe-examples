// File: src/providers/authorize/superadminAuthorize.ts
import { ForbiddenException } from "@nestjs/common";
import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { SuperadminPayload } from "../../decorators/payload/SuperadminPayload";

export async function superadminAuthorize(request: {
  headers: { authorization?: string };
}): Promise<SuperadminPayload> {
  const payload: SuperadminPayload = jwtAuthorize({ request }) as SuperadminPayload;

  if (payload.type !== "super_admin") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // Query session to verify it's not expired
  const session = await MyGlobal.prisma.ecommerce_mall_super_admin_sessions.findFirst({
    where: {
      id: payload.session_id,
      ecommerce_mall_super_admin_id: payload.id,
      expired_at: { gt: new Date() },
    },
  });

  if (session === null) {
    throw new ForbiddenException("Session expired or invalid");
  }

  // Query super admin to verify account exists and is not deleted
  const superAdmin = await MyGlobal.prisma.ecommerce_mall_super_admins.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
    },
  });

  if (superAdmin === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}