import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberSession";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function putDiscussionBoardMembersMemberIdSessionsSessionId(props: {
  member: MemberPayload;
  memberId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
  body: IDiscussionBoardMemberSession.IUpdate;
}): Promise<IDiscussionBoardMemberSession> {
  // Verify member authorization
  if (props.member.id !== props.memberId) {
    throw new HttpException("You can only update your own sessions", 403);
  }

  // Check if session exists and belongs to member
  const existingSession =
    await MyGlobal.prisma.discussion_board_member_sessions.findFirst({
      where: {
        id: props.sessionId,
        discussion_board_member_id: props.memberId,
        deleted_at: null,
      },
    });

  if (!existingSession) {
    throw new HttpException("Session not found", 404);
  }

  // Check if session is already expired
  if (existingSession.expired_at && existingSession.expired_at < new Date()) {
    throw new HttpException("Cannot update an expired session", 400);
  }

  // Prepare update data
  const updateData: Record<string, unknown> = {
    ip: props.body.ip,
    href: props.body.href,
    referrer: props.body.referrer,
    updated_at: toISOStringSafe(new Date()),
  };

  // Handle expired_at field conversion
  if (props.body.expired_at !== undefined && props.body.expired_at !== null) {
    updateData.expired_at = new Date(props.body.expired_at);
  } else if (props.body.expired_at === null) {
    updateData.expired_at = null;
  }

  // Update session
  const updatedSession =
    await MyGlobal.prisma.discussion_board_member_sessions.update({
      where: { id: props.sessionId },
      data: updateData,
    });

  // Convert to API response format with proper null/undefined handling
  return {
    member_id: updatedSession.discussion_board_member_id as string &
      tags.Format<"uuid">,
    ip: updatedSession.ip,
    href: updatedSession.href,
    referrer: updatedSession.referrer,
    expired_at: updatedSession.expired_at
      ? toISOStringSafe(updatedSession.expired_at)
      : null,
    deleted_at: updatedSession.deleted_at
      ? toISOStringSafe(updatedSession.deleted_at)
      : undefined,
  };
}
