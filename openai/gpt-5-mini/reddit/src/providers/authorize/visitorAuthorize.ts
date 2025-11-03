import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { VisitorPayload } from "../../decorators/payload/VisitorPayload";

/**
 * Authenticate and authorize a visitor from Authorization header JWT.
 * Verifies token, checks role discriminator, and validates session and visitor record.
 */
export async function visitorAuthorize(request: {
  headers: { authorization?: string };
}): Promise<VisitorPayload> {
  const payload = jwtAuthorize({ request }) as VisitorPayload;

  if (payload.type !== "visitor") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // Validate session belongs to the visitor and that visitor record is active
  const session = await MyGlobal.prisma.community_bbs_visitor_sessions.findFirst({
    where: {
      id: payload.session_id,
      visitor: {
        id: payload.id,
        deleted_at: null,
      },
      expired_at: null,
    },
  });

  if (session === null) {
    throw new ForbiddenException("You're not enrolled or session invalid/expired");
  }

  return payload;
}
