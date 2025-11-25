import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminSession";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putDiscussionBoardAdminDiscussionBoardAdminsDiscussionBoardAdminIdSessionsSessionId(props: {
  admin: AdminPayload;
  discussionBoardAdminId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
  body: IDiscussionBoardAdminSession.IUpdate;
}): Promise<IDiscussionBoardAdminSession> {
  const existing =
    await MyGlobal.prisma.discussion_board_admin_sessions.findUnique({
      where: { id: props.sessionId },
    });

  if (!existing) {
    throw new HttpException("Session not found", 404);
  }

  if (existing.discussion_board_admin_id !== props.discussionBoardAdminId) {
    throw new HttpException("Forbidden", 403);
  }

  const updated = await MyGlobal.prisma.discussion_board_admin_sessions.update({
    where: { id: props.sessionId },
    data: {
      ip: props.body.ip ?? undefined,
      href: props.body.href ?? undefined,
      referrer: props.body.referrer ?? undefined,
      expired_at: props.body.expired_at ?? undefined,
    },
  });

  return {
    id: updated.id,
    discussion_board_admin_id: updated.discussion_board_admin_id,
    ip: updated.ip,
    href: updated.href,
    referrer: updated.referrer,
    created_at: toISOStringSafe(updated.created_at),
    expired_at:
      updated.expired_at !== null && updated.expired_at !== undefined
        ? toISOStringSafe(updated.expired_at)
        : null,
  };
}
