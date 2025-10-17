import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteDiscussionBoardMemberBlockedUsersBlockedUserId(props: {
  member: MemberPayload;
  blockedUserId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { member, blockedUserId } = props;

  // Find the active blocking relationship owned by this member
  const blockRelationship =
    await MyGlobal.prisma.discussion_board_blocked_users.findFirst({
      where: {
        id: blockedUserId,
        blocker_id: member.id,
        deleted_at: null,
      },
    });

  // Verify the block exists and is owned by this user
  if (!blockRelationship) {
    throw new HttpException(
      "Block relationship not found or you do not have permission to remove it",
      404,
    );
  }

  // Perform soft delete by setting deleted_at timestamp
  await MyGlobal.prisma.discussion_board_blocked_users.update({
    where: { id: blockedUserId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });
}
