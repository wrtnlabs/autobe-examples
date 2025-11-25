import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberSession";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function getDiscussionBoardModeratorMembersUsernameSessionsSessionId(props: {
  moderator: ModeratorPayload;
  username: string;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardMemberSession> {
  // Find the member by username
  const member = await MyGlobal.prisma.discussion_board_members.findFirst({
    where: {
      username: props.username,
      deleted_at: null,
    },
  });

  if (!member) {
    throw new HttpException("Member not found", 404);
  }

  // Find the session by session ID and member relationship
  const session =
    await MyGlobal.prisma.discussion_board_member_sessions.findFirst({
      where: {
        id: props.sessionId,
        discussion_board_member_id: member.id,
        deleted_at: null,
      },
    });

  if (!session) {
    throw new HttpException("Session not found", 404);
  }

  // Convert Date fields to ISO strings and handle null/undefined according to DTO
  // The DTO interface shows expired_at and deleted_at as optional nullable fields
  // So we need to return undefined when the database value is null
  return {
    member_id: session.discussion_board_member_id,
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    expired_at:
      session.expired_at === null
        ? undefined
        : toISOStringSafe(session.expired_at),
    deleted_at:
      session.deleted_at === null
        ? undefined
        : toISOStringSafe(session.deleted_at),
  };
}
