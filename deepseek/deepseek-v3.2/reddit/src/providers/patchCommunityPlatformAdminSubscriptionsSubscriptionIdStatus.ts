import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformSubscriptionTransformer } from "../transformers/CommunityPlatformSubscriptionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformAdminSubscriptionsSubscriptionIdStatus(props: {
  admin: AdminPayload;
  subscriptionId: string & tags.Format<"uuid">;
  body: ICommunityPlatformSubscription.IUpdate;
}): Promise<ICommunityPlatformSubscription> {
  // Verify admin exists and not deleted
  await MyGlobal.prisma.community_platform_admins.findUniqueOrThrow({
    where: { id: props.admin.id, deleted_at: null },
  });
  // Verify subscription exists and not deleted
  const subscription =
    await MyGlobal.prisma.community_platform_subscriptions.findUniqueOrThrow({
      where: { id: props.subscriptionId, deleted_at: null },
      select: {
        id: true,
        active: true,
        member_id: true,
        community_id: true,
      },
    });
  // Check community exists and not deleted
  await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
    where: { id: subscription.community_id, deleted_at: null },
  });
  // If no active field provided, return current subscription without changes
  if (props.body.active === undefined) {
    const current =
      await MyGlobal.prisma.community_platform_subscriptions.findUniqueOrThrow({
        where: { id: props.subscriptionId },
        ...CommunityPlatformSubscriptionTransformer.select(),
      });
    return await CommunityPlatformSubscriptionTransformer.transform(current);
  }
  // Skip if already in desired state
  if (subscription.active === props.body.active) {
    const current =
      await MyGlobal.prisma.community_platform_subscriptions.findUniqueOrThrow({
        where: { id: props.subscriptionId },
        ...CommunityPlatformSubscriptionTransformer.select(),
      });
    return await CommunityPlatformSubscriptionTransformer.transform(current);
  }
  // Business rule: prevent duplicate active subscriptions if activating
  if (props.body.active === true) {
    const existingActive =
      await MyGlobal.prisma.community_platform_subscriptions.findFirst({
        where: {
          member_id: subscription.member_id,
          community_id: subscription.community_id,
          active: true,
          deleted_at: null,
          NOT: { id: props.subscriptionId },
        },
      });
    if (existingActive) {
      throw new HttpException("Duplicate active subscription not allowed", 409);
    }
  }
  // Update subscription
  await MyGlobal.prisma.community_platform_subscriptions.update({
    where: { id: props.subscriptionId },
    data: {
      active: props.body.active,
      updated_at: new Date(),
    },
  });
  // Create activity audit record only if status changed
  const activityId = v4();
  const eventType = props.body.active ? "subscribed" : "unsubscribed";
  const now = new Date();
  await MyGlobal.prisma.community_platform_subscription_activities.create({
    data: {
      id: activityId,
      member_id: subscription.member_id,
      community_id: subscription.community_id,
      subscription_id: props.subscriptionId,
      event_type: eventType,
      event_time: now,
      posting_permission_changed: true,
      feed_inclusion_changed: true,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  // Fetch updated subscription with full transformer select
  const updated =
    await MyGlobal.prisma.community_platform_subscriptions.findUniqueOrThrow({
      where: { id: props.subscriptionId },
      ...CommunityPlatformSubscriptionTransformer.select(),
    });
  return await CommunityPlatformSubscriptionTransformer.transform(updated);
}
