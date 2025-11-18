import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { AdminPayload } from "../../decorators/payload/AdminPayload";

/**
 * Authenticates an admin actor by JWT and validates existence, lock status, and session.
 * Throws ForbiddenException if not valid, returns validated AdminPayload if successful.
 *
 * @param request - The HTTP request object containing authorization header
 * @returns Authenticated and validated AdminPayload
 */
export async function adminAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<AdminPayload> {
  const payload: AdminPayload = jwtAuthorize({ request }) as AdminPayload;

  if (payload.type !== "admin") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // Validate that the admin exists and is not locked, and session binds to admin
  const session = await MyGlobal.prisma.todo_list_admin_sessions.findFirst({
    where: {
      id: payload.session_id,
      todo_list_admin_id: payload.id,
      expired_at: null,
      admin: {
        is_locked: false,
      },
    },
  });
  if (session === null) {
    throw new ForbiddenException("You're not enrolled or session is invalid");
  }

  return payload;
}
