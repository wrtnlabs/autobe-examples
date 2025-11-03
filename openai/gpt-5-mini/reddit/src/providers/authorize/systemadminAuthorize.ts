// File path: src/providers/authorize/systemadminAuthorize.ts
import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { SystemadminPayload } from "../../decorators/payload/SystemadminPayload";

/**
 * Validates JWT and ensures the session belongs to an active system administrator.
 */
export async function systemadminAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<SystemadminPayload> {
  const payload = jwtAuthorize({ request }) as SystemadminPayload;

  if (payload.type !== "systemadmin") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // Ensure the session exists and references the expected system admin
  const session = await MyGlobal.prisma.community_bbs_systemadmin_sessions.findFirst({
    where: {
      id: payload.session_id,
      systemadmin: {
        id: payload.id,
        deleted_at: null,
      },
      OR: [
        { expired_at: null },
        { expired_at: { gt: new Date() } },
      ],
    },
  });

  if (session === null) {
    throw new ForbiddenException("You're not enrolled or your session is invalid");
  }

  return payload;
}
