import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteDiscussionBoardMemberUsersUserIdSessionsSessionId(props: {
  member: MemberPayload;
  userId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { member, userId, sessionId } = props;

  // Authorization: Verify user can only revoke their own sessions
  if (member.id !== userId) {
    throw new HttpException(
      "Unauthorized: You can only revoke your own sessions",
      403,
    );
  }

  // Fetch the session to verify ownership and existence
  const session =
    await MyGlobal.prisma.discussion_board_sessions.findUniqueOrThrow({
      where: { id: sessionId },
    });

  // Verify session belongs to the requesting user
  if (session.discussion_board_member_id !== userId) {
    throw new HttpException(
      "Unauthorized: This session does not belong to you",
      403,
    );
  }

  // Hard delete the session (no soft delete since schema lacks deleted_at)
  // Cascade delete will automatically remove associated refresh token
  await MyGlobal.prisma.discussion_board_sessions.delete({
    where: { id: sessionId },
  });
}
