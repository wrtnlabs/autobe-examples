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

  // Query using id directly since Admin is standalone (no user_id FK)
  const admin = await MyGlobal.prisma.ecommerce_mall_admins.findFirst({
    where: {
      id: payload.id,
      deleted_at: null, // Soft-delete check
    },
  });

  if (admin === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  // Session expiration check
  const session = await MyGlobal.prisma.ecommerce_mall_admin_sessions.findFirst({
    where: {
      id: payload.session_id,
      expired_at: { gt: new Date() }, // Valid until expiration time
    },
  });

  if (session === null) {
    throw new ForbiddenException("Session expired");
  }

  return payload;
}