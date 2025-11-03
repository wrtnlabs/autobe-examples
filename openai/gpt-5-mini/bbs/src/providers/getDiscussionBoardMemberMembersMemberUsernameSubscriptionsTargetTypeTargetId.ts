import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSubscription";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function getDiscussionBoardMemberMembersMemberUsernameSubscriptionsTargetTypeTargetId(props: {
  memberUsername: string;
  targetType: string;
  targetId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardSubscription> {
  const { memberUsername, targetType, targetId } = props;

  // Business-level validation for allowed subscription target types
  if (targetType !== "article" && targetType !== "author")
    throw new HttpException("Bad Request: unsupported targetType", 400);

  // Resolve member by username
  const member = await MyGlobal.prisma.discussion_board_member.findUnique({
    where: { username: memberUsername },
    select: { id: true, username: true, display_name: true, created_at: true },
  });

  if (!member) throw new HttpException("Not Found: member does not exist", 404);

  // Retrieve subscription matching member id, target type and target id
  const subscription =
    await MyGlobal.prisma.discussion_board_subscriptions.findFirst({
      where: {
        discussion_board_member_id: member.id,
        target_type: targetType,
        target_id: targetId,
      },
      select: {
        id: true,
        discussion_board_member_id: true,
        target_type: true,
        target_id: true,
        delivery_mode: true,
        active: true,
        last_notified_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });

  if (!subscription)
    throw new HttpException("Not Found: subscription does not exist", 404);

  // Treat soft-deleted subscription as not found for member reads
  if (subscription.deleted_at !== null)
    throw new HttpException("Not Found: subscription does not exist", 404);

  // Map database fields to API DTO and convert Date fields to ISO strings
  return {
    id: subscription.id as string & tags.Format<"uuid">,
    member: {
      id: member.id as string & tags.Format<"uuid">,
      username: member.username,
      display_name: member.display_name === null ? null : member.display_name,
      created_at: toISOStringSafe(member.created_at),
    },
    // Narrow literal string fields using typia.assert at the individual property level
    targetType: typia.assert<"author" | "article">(subscription.target_type),
    targetId: subscription.target_id as string & tags.Format<"uuid">,
    deliveryMode: typia.assert<"immediate" | "daily_digest">(
      subscription.delivery_mode,
    ),
    active: subscription.active,
    lastNotifiedAt: subscription.last_notified_at
      ? toISOStringSafe(subscription.last_notified_at)
      : null,
    createdAt: toISOStringSafe(subscription.created_at),
    updatedAt: subscription.updated_at
      ? toISOStringSafe(subscription.updated_at)
      : null,
    deletedAt: subscription.deleted_at
      ? toISOStringSafe(subscription.deleted_at)
      : null,
  };
}
