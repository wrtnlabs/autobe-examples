import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteDiscussionBoardMemberMembersMemberUsernameSubscriptionsTargetTypeTargetId(props: {
  member: MemberPayload;
  memberUsername: string;
  targetType: string;
  targetId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { member, memberUsername, targetType, targetId } = props;

  // Resolve member by username
  const memberRecord = await MyGlobal.prisma.discussion_board_member.findUnique(
    {
      where: { username: memberUsername },
    },
  );
  if (!memberRecord) throw new HttpException("Not Found", 404);

  // Authorization: only the authenticated member may manage their subscriptions
  if (memberRecord.id !== member.id) {
    throw new HttpException(
      "Unauthorized: You can only unsubscribe your own subscriptions",
      403,
    );
  }

  // Locate subscription (include soft-deleted for idempotency checks)
  const subscription =
    await MyGlobal.prisma.discussion_board_subscriptions.findFirst({
      where: {
        discussion_board_member_id: memberRecord.id,
        target_type: targetType,
        target_id: targetId,
      },
    });

  if (!subscription) throw new HttpException("Not Found", 404);

  // Idempotent: if already soft-deleted, succeed
  if (subscription.deleted_at) return;

  const now = toISOStringSafe(new Date());

  await MyGlobal.prisma.discussion_board_subscriptions.update({
    where: { id: subscription.id },
    data: {
      deleted_at: now,
      active: false,
      updated_at: now,
    },
  });
}
