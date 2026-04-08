import { ForbiddenException } from "@nestjs/common";
import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { AdminPayload } from "../../decorators/payload/AdminPayload";

export async function adminAuthorize(request: {
  headers: { authorization?: string };
}): Promise<AdminPayload> {
  const payload: AdminPayload = jwtAuthorize({ request }) as AdminPayload;

  if (payload.type !== "admin") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  const admin = await MyGlobal.prisma.ecommerce_admins.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
    },
  });

  if (admin === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  const session = await MyGlobal.prisma.ecommerce_admin_sessions.findFirst({
    where: {
      id: payload.session_id,
      ecommerce_admin_id: payload.id,
      deleted_at: null,
      expired_at: { gt: new Date() },
    },
  });

  if (session === null) {
    throw new ForbiddenException("Session expired or invalid");
  }

  return payload;
}