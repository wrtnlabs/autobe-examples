import { ForbiddenException, UnauthorizedException } from "@nestjs/common";

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

  // Query admin record using payload.id as top-level user ID
  const admin = await MyGlobal.prisma.todo_list_admin.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
    },
  });

  if (admin === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  // Verify active session
  const session = await MyGlobal.prisma.todo_list_admin_sessions.findFirst({
    where: {
      id: payload.session_id,
      expired_at: { gt: new Date() },
      admin_id: payload.id,
    },
  });

  if (!session) {
    throw new ForbiddenException("Invalid or expired authentication session");
  }

  return payload;
}