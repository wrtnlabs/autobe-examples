import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function getRedditCommunityUserCommunitiesCommunityNameSubscriptionsSubscriptionId(props: {
  user: UserPayload;
  communityName: string;
  subscriptionId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunitySubscription> {
  const { user, communityName, subscriptionId } = props;

  // Find community by unique name
  const community =
    await MyGlobal.prisma.reddit_community_communities.findUnique({
      where: { name: communityName },
    });
  if (!community) {
    throw new HttpException("Subscription not found", 404);
  }

  // Find subscription by id and community id
  const subscription =
    await MyGlobal.prisma.reddit_community_subscriptions.findUnique({
      where: { id: subscriptionId },
    });

  if (
    !subscription ||
    subscription.reddit_community_community_id !== community.id
  ) {
    throw new HttpException("Subscription not found", 404);
  }

  // Authorization: only subscription owner can access
  if (subscription.reddit_community_user_id !== user.id) {
    throw new HttpException("Unauthorized", 403);
  }

  // Return subscription data with proper date conversion
  return {
    id: subscription.id,
    reddit_community_user_id: subscription.reddit_community_user_id,
    reddit_community_community_id: subscription.reddit_community_community_id,
    created_at: toISOStringSafe(subscription.created_at),
    updated_at: toISOStringSafe(subscription.updated_at),
  };
}
