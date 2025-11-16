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

  const session = await MyGlobal.prisma.shopping_mall_admin_sessions.findFirst(
    {
      where: {
        id: payload.session_id,
        shopping_mall_admin_id: payload.id,
        expired_at: null,
      },
    },
  );

  if (session === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  const admin = await MyGlobal.prisma.shopping_mall_admins.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
      email_verified: true,
    },
  });

  if (admin === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}