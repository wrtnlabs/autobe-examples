import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteDiscussionBoardMemberMembersUsernameSessionsSessionId(props: {
  member: MemberPayload;
  username: string;
  sessionId: string & tags.Format<"uuid">;
}): Promise<void> {
  // First, find the member by username to get their ID
  const targetMember = await MyGlobal.prisma.discussion_board_members.findFirst(
    {
      where: {
        username: props.username,
        deleted_at: null,
      },
    },
  );

  if (!targetMember) {
    throw new HttpException("Member not found", 404);
  }

  // Verify the session exists and belongs to the target member
  const session =
    await MyGlobal.prisma.discussion_board_member_sessions.findFirst({
      where: {
        id: props.sessionId,
        discussion_board_member_id: targetMember.id,
        deleted_at: null,
      },
    });

  if (!session) {
    throw new HttpException("Session not found", 404);
  }

  // Check if the authenticated member is authorized to delete this session
  // Only allow deletion if the authenticated member owns the session
  if (props.member.id !== targetMember.id) {
    throw new HttpException("You can only delete your own sessions", 403);
  }

  // Perform hard delete of the session
  await MyGlobal.prisma.discussion_board_member_sessions.delete({
    where: {
      id: props.sessionId,
    },
  });
}
