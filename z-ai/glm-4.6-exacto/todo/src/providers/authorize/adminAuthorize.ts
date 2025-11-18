import { ForbiddenException } from "@nestjs/common";
import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { AdminPayload } from "../../decorators/payload/AdminPayload";

/**
 * Authorize and authenticate admin via JWT and database validation.
 * Throws ForbiddenException if role/type mismatch or non-existent/invalid account.
 */
export async function adminAuthorize(request: {
  headers: { authorization?: string };
}): Promise<AdminPayload> {
  const payload: AdminPayload = jwtAuthorize({ request }) as AdminPayload;

  if (payload.type !== "admin") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // payload.id is always the admin's id (primary key) for todo_app_admins
  const admin = await MyGlobal.prisma.todo_app_admins.findFirst({
    where: {
      id: payload.id,
      deleted_at: null
    },
  });
  if (!admin) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}
