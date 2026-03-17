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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformMemberSubscriptionsSubscriptionIdStatus(props: {
  member: MemberPayload;
  subscriptionId: string & tags.Format<"uuid">;
  body: ICommunityPlatformSubscription.IUpdate;
}): Promise<ICommunityPlatformSubscription> {
  // Step 1: Validate subscription existence and ownership
  const existingSubscription =
    await MyGlobal.prisma.community_platform_subscriptions.findUnique({
      where: { id: props.subscriptionId, deleted_at: null },
      select: {
        id: true,
        member_id: true,
        community_id: true,
        active: true,
      },
    });
  if (!existingSubscription) {
    throw new HttpException("Subscription not found", 404);
  }
  if (existingSubscription.member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 2: Validate community existence
  const community =
    await MyGlobal.prisma.community_platform_communities.findUnique({
      where: { id: existingSubscription.community_id, deleted_at: null },
      select: {
        id: true,
        name: true,
        description: true,
        created_at: true,
        owner_member_id: true,
      },
    });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }
  // Step 3: Check if active field is provided
  if (props.body.active === undefined) {
    throw new HttpException("active field is required", 400);
  }
  // Step 4: Enforce business rules - prevent duplicate active subscriptions
  if (props.body.active === true && existingSubscription.active === false) {
    // Check if another active subscription exists for same member+community
    const existingActive =
      await MyGlobal.prisma.community_platform_subscriptions.findFirst({
        where: {
          member_id: props.member.id,
          community_id: existingSubscription.community_id,
          active: true,
          deleted_at: null,
          id: { not: props.subscriptionId },
        },
      });
    if (existingActive) {
      throw new HttpException("Duplicate active subscription not allowed", 409);
    }
  }
  // Step 5: Update subscription
  const updated = await MyGlobal.prisma.community_platform_subscriptions.update(
    {
      where: { id: props.subscriptionId },
      data: {
        active: props.body.active,
        updated_at: new Date(),
      },
    },
  );
  // Step 6: Create audit trail - FIXED: Added missing required fields
  await MyGlobal.prisma.community_platform_subscription_activities.create({
    data: {
      id: v4(),
      subscription_id: existingSubscription.id,
      member_id: existingSubscription.member_id,
      community_id: existingSubscription.community_id,
      event_type: props.body.active ? "subscribed" : "unsubscribed",
      posting_permission_changed: true,
      feed_inclusion_changed: true,
      event_time: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    },
  });
  // Step 7: Fetch and return complete subscription with all required data
  const completeSubscription =
    await MyGlobal.prisma.community_platform_subscriptions.findUniqueOrThrow({
      where: { id: props.subscriptionId },
      select: {
        id: true,
        active: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        member: {
          select: {
            id: true,
            email: true,
            username: true,
            nickname: true,
            email_verified: true,
            registered_at: true,
            last_login_at: true,
          },
        },
        community: {
          select: {
            id: true,
            name: true,
            description: true,
            created_at: true,
            owner_member_id: true,
          },
        },
      },
    });
  // Fetch owner separately
  const owner = await MyGlobal.prisma.community_platform_members.findUnique({
    where: { id: community.owner_member_id },
    select: {
      id: true,
      email: true,
      username: true,
      nickname: true,
      email_verified: true,
      registered_at: true,
      last_login_at: true,
    },
  });
  if (!owner) {
    throw new HttpException("Community owner not found", 404);
  }
  return {
    id: completeSubscription.id,
    active: completeSubscription.active,
    created_at: toISOStringSafe(completeSubscription.created_at),
    updated_at: toISOStringSafe(completeSubscription.updated_at),
    deleted_at: completeSubscription.deleted_at
      ? toISOStringSafe(completeSubscription.deleted_at)
      : null,
    member: {
      id: completeSubscription.member.id,
      email: completeSubscription.member.email,
      username: completeSubscription.member.username,
      nickname: completeSubscription.member.nickname ?? undefined,
      email_verified: completeSubscription.member.email_verified,
      registered_at: toISOStringSafe(completeSubscription.member.registered_at),
      last_login_at: completeSubscription.member.last_login_at
        ? toISOStringSafe(completeSubscription.member.last_login_at)
        : undefined,
    },
    community: {
      id: completeSubscription.community.id,
      name: completeSubscription.community.name,
      description: completeSubscription.community.description,
      created_at: toISOStringSafe(completeSubscription.community.created_at),
      owner: {
        id: owner.id,
        email: owner.email,
        username: owner.username,
        nickname: owner.nickname ?? undefined,
        email_verified: owner.email_verified,
        registered_at: toISOStringSafe(owner.registered_at),
        last_login_at: owner.last_login_at
          ? toISOStringSafe(owner.last_login_at)
          : undefined,
      },
      subscriber_count: 0,
    },
  };
}
