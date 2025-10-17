import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postCommunityPlatformMemberSubscriptions(props: {
  member: MemberPayload;
  body: ICommunityPlatformSubscription.ICreate;
}): Promise<ICommunityPlatformSubscription> {
  // Extract data from props
  const { member, body } = props;

  // Get the current timestamp as ISO string
  const now = toISOStringSafe(new Date());

  // Verify the community exists and is active
  const community =
    await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
      where: {
        id: body.community_id,
      },
    });

  // Check platform-wide subscription limit
  const platformSettings =
    await MyGlobal.prisma.community_platform_platform_settings.findFirst();
  const maxSubscriptions = platformSettings?.max_community_members || 1000;

  // Count current subscriptions for this user
  const subscriptionCount =
    await MyGlobal.prisma.community_platform_subscriptions.count({
      where: {
        community_platform_member_id: member.id,
        deleted_at: null,
        active: true,
      },
    });

  // Check if user has reached max subscription limit
  if (subscriptionCount >= maxSubscriptions) {
    throw new HttpException(
      "User has reached the maximum number of community subscriptions (1000)",
      403,
    );
  }

  // Check if user is already subscribed to this community (active subscription)
  const existingSubscription =
    await MyGlobal.prisma.community_platform_subscriptions.findFirst({
      where: {
        community_platform_member_id: member.id,
        community_platform_communities_id: body.community_id,
        deleted_at: null,
        active: true,
      },
    });

  if (existingSubscription) {
    throw new HttpException("Already subscribed to this community", 409);
  }

  // Create the subscription
  const created = await MyGlobal.prisma.community_platform_subscriptions.create(
    {
      data: {
        id: v4() as string & tags.Format<"uuid">, // Added missing required 'id' field
        community_platform_member_id: member.id,
        community_platform_communities_id: body.community_id,
        created_at: now,
        updated_at: now,
        deleted_at: null,
        active: true,
      },
    },
  );

  // Return the subscription matching ICommunityPlatformSubscription structure exactly
  // No property type assertions - using satisfies to ensure type safety
  return {
    id: created.id,
    member_id: created.community_platform_member_id,
    community_id: created.community_platform_communities_id,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
    active: created.active,
    metadata: null,
  } satisfies ICommunityPlatformSubscription;
}
