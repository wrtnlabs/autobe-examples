import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberSession";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function putDiscussionBoardMemberMembersUsernameSessionsSessionId(props: {
  member: MemberPayload;
  username: string;
  sessionId: string & tags.Format<"uuid">;
  body: IDiscussionBoardMemberSession.IUpdate;
}): Promise<IDiscussionBoardMemberSession> {
  // First verify that the authenticated member matches the username
  const member = await MyGlobal.prisma.discussion_board_members.findFirst({
    where: {
      id: props.member.id,
      username: props.username,
      deleted_at: null,
    },
  });

  if (!member) {
    throw new HttpException("Member not found or username mismatch", 404);
  }

  // Verify the session exists and belongs to this member
  const existingSession =
    await MyGlobal.prisma.discussion_board_member_sessions.findFirst({
      where: {
        id: props.sessionId,
        discussion_board_member_id: props.member.id,
        deleted_at: null,
      },
    });

  if (!existingSession) {
    throw new HttpException("Session not found", 404);
  }

  // Update the session with new connection details
  const updated = await MyGlobal.prisma.discussion_board_member_sessions.update(
    {
      where: { id: props.sessionId },
      data: {
        ip: props.body.ip,
        href: props.body.href,
        referrer: props.body.referrer,
        expired_at: props.body.expired_at ?? null,
        updated_at: toISOStringSafe(new Date()),
      },
    },
  );

  // Map database fields to API DTO structure
  return {
    member_id: updated.discussion_board_member_id,
    ip: updated.ip,
    href: updated.href,
    referrer: updated.referrer,
    expired_at: updated.expired_at ? toISOStringSafe(updated.expired_at) : null,
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
