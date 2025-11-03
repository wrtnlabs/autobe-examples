import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { VisitorPayload } from "../../decorators/payload/VisitorPayload";

export async function visitorAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<VisitorPayload> {
  const payload: VisitorPayload = jwtAuthorize({ request }) as VisitorPayload;

  if (payload.type !== "visitor") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // Query visitor session using session_id from JWT payload
  const session = await MyGlobal.prisma.politics_bbs_visitor_sessions.findFirst({
    where: {
      id: payload.session_id,
      visitor: {
        id: payload.id,
      },
      expired_at: null,
    },
  });

  if (session === null) {
    throw new ForbiddenException("Session not found or expired");
  }

  return payload;
}