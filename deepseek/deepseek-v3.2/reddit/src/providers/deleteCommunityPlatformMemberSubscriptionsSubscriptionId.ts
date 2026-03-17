import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteCommunityPlatformMemberSubscriptionsSubscriptionId(props: {
  member: MemberPayload;
  subscriptionId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Verify subscription exists and belongs to current member
  const subscription =
    await MyGlobal.prisma.community_platform_subscriptions.findUniqueOrThrow({
      where: { id: props.subscriptionId },
      select: {
        id: true,
        member_id: true,
        community_id: true,
        active: true,
        deleted_at: true,
        created_at: true,
        updated_at: true,
      },
    });
  // 2. Authorization check - subscription must belong to authenticated member
  if (subscription.member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Business validation - subscription must be active and not already deleted
  if (!subscription.active) {
    throw new HttpException("Subscription is already inactive", 400);
  }
  if (subscription.deleted_at !== null) {
    throw new HttpException("Subscription is already deleted", 400);
  }
  const now = new Date();
  // 4. Create snapshot of current subscription state before deletion
  await MyGlobal.prisma.community_platform_subscription_snapshots.create({
    data: {
      id: v4(),
      community_platform_subscription_id: subscription.id,
      user_id: props.member.id,
      community_id: subscription.community_id,
      status: "active", // Current status before unsubscription
      posting_permission_granted: true, // Currently has permission
      feed_included: true, // Currently in feed
      subscribed_at: subscription.created_at,
      unsubscribed_at: now, // Unsubscribing now
      created_at: now,
    },
  });
  // 5. Update subscription to inactive/deleted
  await MyGlobal.prisma.community_platform_subscriptions.update({
    where: { id: props.subscriptionId },
    data: {
      active: false,
      deleted_at: now,
      updated_at: now,
    },
  });
  // 6. Create activity record for unsubscription
  await MyGlobal.prisma.community_platform_subscription_activities.create({
    data: {
      id: v4(),
      member_id: props.member.id,
      community_id: subscription.community_id,
      subscription_id: subscription.id,
      event_type: "unsubscribed",
      event_time: now,
      posting_permission_changed: true,
      feed_inclusion_changed: true,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
}
