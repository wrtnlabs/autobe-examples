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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformSubscriptionTransformer } from "../transformers/CommunityPlatformSubscriptionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformMemberSubscriptionsSubscriptionId(props: {
  member: MemberPayload;
  subscriptionId: string & tags.Format<"uuid">;
  body: ICommunityPlatformSubscription.IUpdate;
}): Promise<ICommunityPlatformSubscription> {
  // Fetch subscription with community to check for soft-delete and verify ownership
  const subscription =
    await MyGlobal.prisma.community_platform_subscriptions.findUniqueOrThrow({
      where: { id: props.subscriptionId },
      select: {
        id: true,
        member_id: true,
        community_id: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        community: {
          select: {
            id: true,
            deleted_at: true,
          },
        },
      },
    });
  // Verify ownership - only the member who owns the subscription can update it
  if (subscription.member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Reject updates if the community has been deleted
  if (subscription.community.deleted_at !== null) {
    throw new HttpException("Community has been deleted", 400);
  }
  // Determine the new active state (default to current if not provided)
  const newIsActive = props.body.is_active ?? subscription.is_active;
  // If no change needed, return current subscription without updates
  if (newIsActive === subscription.is_active) {
    const existing =
      await MyGlobal.prisma.community_platform_subscriptions.findUniqueOrThrow({
        where: { id: props.subscriptionId },
        ...CommunityPlatformSubscriptionTransformer.select(),
      });
    return await CommunityPlatformSubscriptionTransformer.transform(existing);
  }
  // Update subscription with new state and timestamp
  const updated = await MyGlobal.prisma.community_platform_subscriptions.update(
    {
      where: { id: props.subscriptionId },
      data: {
        is_active: newIsActive,
        updated_at: new Date(),
      },
      ...CommunityPlatformSubscriptionTransformer.select(),
    },
  );
  // Adjust community subscriber count atomically
  // Activating: increment by 1, Deactivating: decrement by 1
  await MyGlobal.prisma.community_platform_communities.update({
    where: { id: subscription.community_id },
    data: {
      subscriber_count: newIsActive ? { increment: 1 } : { decrement: 1 },
    },
  });
  return await CommunityPlatformSubscriptionTransformer.transform(updated);
}
