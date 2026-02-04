import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { AdminPayload } from "../../decorators/payload/AdminPayload";

export async function adminAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<AdminPayload> {
  const payload: AdminPayload = jwtAuthorize({ request }) as AdminPayload;

  if (payload.type !== "admin") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // Query admin_session table for active session linked to admin
  const adminSession = await MyGlobal.prisma.shopping_mall_admin_sessions.findFirst({
    where: {
      id: payload.session_id,
      expired_at: { gt: new Date() },
      admin: {
        id: payload.id,
        deleted_at: null,
      },
    },
  });

  if (adminSession === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}