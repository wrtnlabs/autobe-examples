import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteDiscussionBoardMembersMemberIdSessionsSessionId(props: {
  member: MemberPayload;
  memberId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify the session exists and belongs to the authenticated member
  const existingSession =
    await MyGlobal.prisma.discussion_board_member_sessions.findFirst({
      where: {
        id: props.sessionId,
        discussion_board_member_id: props.memberId,
        deleted_at: null,
      },
    });

  if (!existingSession) {
    throw new HttpException("Session not found or already deleted", 404);
  }

  // Verify that the authenticated member owns this session
  if (existingSession.discussion_board_member_id !== props.member.id) {
    throw new HttpException(
      "Forbidden: You can only delete your own sessions",
      403,
    );
  }

  // Perform soft delete by setting deleted_at timestamp
  await MyGlobal.prisma.discussion_board_member_sessions.update({
    where: { id: props.sessionId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });
}
