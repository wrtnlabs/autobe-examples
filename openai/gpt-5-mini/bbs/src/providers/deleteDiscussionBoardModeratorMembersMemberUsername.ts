import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function deleteDiscussionBoardModeratorMembersMemberUsername(props: {
  moderator: ModeratorPayload;
  memberUsername: string;
}): Promise<void> {
  const { moderator, memberUsername } = props;

  // Find member by username
  const member = await MyGlobal.prisma.discussion_board_member.findUnique({
    where: { username: memberUsername },
    select: { id: true, username: true, deleted_at: true },
  });

  if (!member) {
    throw new HttpException("Not Found: member not found", 404);
  }

  if (member.deleted_at !== null) {
    throw new HttpException("Not Found: member already deleted", 404);
  }

  // Simple blocking check: any unresolved appeals by this member
  const blockingAppeal =
    await MyGlobal.prisma.discussion_board_appeals.findFirst({
      where: { appellant_member_id: member.id, status: { not: "resolved" } },
      select: { id: true },
    });

  if (blockingAppeal) {
    throw new HttpException("Conflict: member has pending appeals", 409);
  }

  const now = toISOStringSafe(new Date());

  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.discussion_board_member.update({
      where: { id: member.id },
      data: { deleted_at: now, updated_at: now },
    }),

    MyGlobal.prisma.discussion_board_member_sessions.updateMany({
      where: { discussion_board_member_id: member.id, expired_at: null },
      data: { expired_at: now },
    }),

    MyGlobal.prisma.discussion_board_audit_logs.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        event_type: "moderation.member.soft_delete",
        event_timestamp: now,
        actor_type: "moderator",
        actor_id: moderator.id,
        resource_type: "member",
        resource_id: member.id,
        metadata: JSON.stringify({
          moderator_id: moderator.id,
          member_username: member.username,
        }),
        created_at: now,
        updated_at: now,
      },
    }),

    MyGlobal.prisma.discussion_board_moderation_audit.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        actor_moderator_id: moderator.id,
        event_type: "member.soft_delete",
        event_payload: JSON.stringify({
          moderator_id: moderator.id,
          member_username: member.username,
        }),
        occurred_at: now,
      },
    }),
  ]);

  return;
}
