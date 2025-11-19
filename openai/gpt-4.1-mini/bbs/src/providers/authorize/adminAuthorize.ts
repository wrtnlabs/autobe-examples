import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { AdminPayload } from "../../decorators/payload/AdminPayload";

export async function adminAuthorize(request: { headers: { authorization?: string } }): Promise<AdminPayload> {
  const payload: AdminPayload = jwtAuthorize({ request }) as AdminPayload;

  if (payload.type !== "admin") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  const session = await MyGlobal.prisma.discussion_board_admin_sessions.findFirst({
    where: {
      id: payload.session_id,
      discussion_board_admin_id: payload.id,
      expired_at: null,
      discussionBoardAdmin: {
        deleted_at: null
      }
    },
  });

  if (session === null) {
    throw new ForbiddenException("You're not enrolled or session expired");
  }

  return payload;
}
