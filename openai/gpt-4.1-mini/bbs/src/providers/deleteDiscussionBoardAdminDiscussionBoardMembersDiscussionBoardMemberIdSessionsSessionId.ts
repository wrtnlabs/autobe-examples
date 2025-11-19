import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteDiscussionBoardAdminDiscussionBoardMembersDiscussionBoardMemberIdSessionsSessionId(props: {
  admin: AdminPayload;
  discussionBoardMemberId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const existing =
    await MyGlobal.prisma.discussion_board_member_sessions.findUnique({
      where: {
        id: props.sessionId,
      },
      select: { discussion_board_member_id: true },
    });
  if (!existing) {
    throw new HttpException("Session not found", 404);
  }
  if (existing.discussion_board_member_id !== props.discussionBoardMemberId) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.discussion_board_member_sessions.delete({
    where: { id: props.sessionId },
  });
}
