import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function deleteAuthModeratorSessionsSessionId(props: {
  moderator: ModeratorPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardModerator.ISessionErasedResult> {
  const { moderator, sessionId } = props;

  // Retrieve session and minimal context for audit
  const session =
    await MyGlobal.prisma.discussion_board_moderator_sessions.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        discussion_board_moderator_id: true,
        ip: true,
        href: true,
        referrer: true,
        expired_at: true,
      },
    });

  if (!session) {
    throw new HttpException("Not Found", 404);
  }

  // Authorization: only the session owner may revoke
  if (session.discussion_board_moderator_id !== moderator.id) {
    throw new HttpException(
      "Unauthorized: You can only revoke your own sessions",
      403,
    );
  }

  // Current time as ISO string (branded via toISOStringSafe)
  const now = toISOStringSafe(new Date());

  // Revoke the session by setting expired_at = now
  await MyGlobal.prisma.discussion_board_moderator_sessions.update({
    where: { id: sessionId },
    data: {
      expired_at: now,
    },
  });

  // Record audit entry for traceability
  await MyGlobal.prisma.discussion_board_audit_logs.create({
    data: {
      id: v4(),
      event_type: "moderation.session.revoked",
      event_timestamp: now,
      resource_type: "session",
      resource_id: sessionId,
      actor_type: "moderator",
      actor_id: moderator.id,
      metadata: JSON.stringify({
        ip: session.ip ?? null,
        href: session.href ?? null,
        referrer: session.referrer ?? null,
      }),
      created_at: now,
      updated_at: now,
    },
  });

  return {
    erased: true,
    id: sessionId,
  };
}
