import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { AdminPayload } from "../../decorators/payload/AdminPayload";

export async function adminAuthorize(request: { headers: { authorization?: string } }): Promise<AdminPayload> {
  const payload: AdminPayload = jwtAuthorize({ request }) as AdminPayload;

  if (payload.type !== "admin") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  const admin = await MyGlobal.prisma.todo_list_admins.findFirst({
    where: {
      id: payload.id,
      deleted_at: null
    },
  });

  if (admin === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  const session = await MyGlobal.prisma.todo_list_admin_sessions.findFirst({
    where: {
      id: payload.session_id,
      todo_list_admin_id: payload.id,
      expired_at: null
    }
  });

  if (session === null) {
    throw new ForbiddenException("Session is not valid");
  }

  return payload;
}
