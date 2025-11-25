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

export async function putDiscussionBoardMemberDiscussionBoardMembersDiscussionBoardMemberIdSessionsSessionId(props: {
  member: MemberPayload;
  discussionBoardMemberId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
  body: IDiscussionBoardMemberSession.IUpdate;
}): Promise<IDiscussionBoardMemberSession> {
  const existing =
    await MyGlobal.prisma.discussion_board_member_sessions.findUnique({
      where: { id: props.sessionId },
    });

  if (!existing) {
    throw new HttpException("Session not found", 404);
  }

  if (existing.discussion_board_member_id !== props.discussionBoardMemberId) {
    throw new HttpException("Forbidden", 403);
  }

  // Remove 'updated_at' from update data as it does not exist in Prisma update input
  const updated = await MyGlobal.prisma.discussion_board_member_sessions.update(
    {
      where: { id: props.sessionId },
      data: {
        ip: props.body.ip,
        href: props.body.href,
        referrer: props.body.referrer,
        expired_at: props.body.expired_at ?? null,
        created_at:
          props.body.created_at ?? toISOStringSafe(existing.created_at),
        // updated_at removed here
      },
    },
  );

  return {
    id: updated.id,
    discussion_board_member_id: updated.discussion_board_member_id,
    ip: updated.ip,
    href: updated.href,
    referrer: updated.referrer,
    created_at: toISOStringSafe(updated.created_at),
    expired_at:
      updated.expired_at !== null ? toISOStringSafe(updated.expired_at) : null,
  };
}
