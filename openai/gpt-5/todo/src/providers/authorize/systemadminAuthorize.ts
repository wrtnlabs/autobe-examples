import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize"; // CORRECT: same directory import
import { SystemadminPayload } from "../../decorators/payload/SystemadminPayload";

/**
 * Authenticate and authorize a System Admin using JWT and DB verification.
 *
 * - Verifies JWT via shared jwtAuthorize
 * - Ensures payload.type === "systemadmin"
 * - Confirms existence and active status in DB (deleted_at null)
 */
export async function systemadminAuthorize(request: {
  headers: { authorization?: string };
}): Promise<SystemadminPayload> {
  const payload: SystemadminPayload = jwtAuthorize({ request }) as SystemadminPayload;

  if (payload.type !== "systemadmin")
    throw new ForbiddenException("You're not systemadmin");

  // Standalone role table → payload.id equals todo_list_system_admins.id
  const admin = await MyGlobal.prisma.todo_list_system_admins.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
    },
  });

  if (admin === null) throw new ForbiddenException("You're not enrolled");

  return payload;
}
