import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteDiscussionBoardMemberUsersUserIdBlockedUsersBlockedUserId(props: {
  member: MemberPayload;
  userId: string & tags.Format<"uuid">;
  blockedUserId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { member, userId, blockedUserId } = props;

  // MANDATORY AUTHORIZATION: Verify authenticated user owns this block
  // Only the blocker can remove their own blocking relationships
  if (member.id !== userId) {
    throw new HttpException(
      "Unauthorized: You can only remove your own blocking relationships",
      403,
    );
  }

  // Find the blocking relationship using the unique constraint
  const blockRelationship =
    await MyGlobal.prisma.discussion_board_blocked_users.findFirst({
      where: {
        blocker_id: userId,
        blocked_id: blockedUserId,
      },
    });

  // Verify the blocking relationship exists before attempting deletion
  if (!blockRelationship) {
    throw new HttpException(
      "Blocking relationship not found. The specified user may not be blocked.",
      404,
    );
  }

  // Perform hard delete (schema lacks deleted_at field for soft delete)
  await MyGlobal.prisma.discussion_board_blocked_users.delete({
    where: {
      id: blockRelationship.id,
    },
  });
}
