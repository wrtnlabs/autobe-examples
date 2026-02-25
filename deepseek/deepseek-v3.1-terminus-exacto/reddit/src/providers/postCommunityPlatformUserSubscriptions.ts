import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformCommunitySubscriptionCollector } from "../collectors/CommunityPlatformCommunitySubscriptionCollector";
import { UserPayload } from "../decorators/payload/UserPayload";
import { CommunityPlatformCommunitySubscriptionTransformer } from "../transformers/CommunityPlatformCommunitySubscriptionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformUserSubscriptions(props: {
  user: UserPayload;
  body: ICommunityPlatformCommunitySubscription.ICreate;
}): Promise<ICommunityPlatformCommunitySubscription> {
  // Verify target community exists
  const community =
    await MyGlobal.prisma.community_platform_communities.findFirstOrThrow({
      where: { id: props.body.community_platform_community_id },
    });
  // Check for existing active subscription to prevent duplicates
  const existingSubscription =
    await MyGlobal.prisma.community_platform_community_subscriptions.findUnique(
      {
        where: {
          community_platform_user_id_community_platform_community_id: {
            community_platform_user_id: props.user.id,
            community_platform_community_id:
              props.body.community_platform_community_id,
          },
        },
      },
    );
  if (existingSubscription && !existingSubscription.deleted_at) {
    throw new HttpException(
      "User is already subscribed to this community",
      409,
    );
  }
  // Validate subscription limits (max 1000 per user from requirements)
  const activeSubscriptionCount =
    await MyGlobal.prisma.community_platform_community_subscriptions.count({
      where: {
        community_platform_user_id: props.user.id,
        deleted_at: null,
      },
    });
  if (activeSubscriptionCount >= 1000) {
    throw new HttpException("Maximum subscription limit reached (1000)", 400);
  }
  // Collect data for subscription creation
  const collectedData =
    await CommunityPlatformCommunitySubscriptionCollector.collect({
      body: props.body,
      communityPlatformUsers: { id: props.user.id },
    });
  // Create subscription using collected data
  const createdSubscription =
    await MyGlobal.prisma.community_platform_community_subscriptions.create({
      data: collectedData,
      include: {
        user: true,
        community: {
          include: {
            owner: true,
          },
        },
      },
    });
  // Transform and return the created subscription
  return await CommunityPlatformCommunitySubscriptionTransformer.transform(
    createdSubscription,
  );
}
