import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteRedditCommunityUserCommunitiesCommunityNameSubscriptionsSubscriptionId(props: {
  user: UserPayload;
  communityName: string;
  subscriptionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { user, communityName, subscriptionId } = props;

  const community =
    await MyGlobal.prisma.reddit_community_communities.findUnique({
      where: { name: communityName },
      select: { id: true },
    });

  if (!community) {
    throw new HttpException(`Community not found: ${communityName}`, 404);
  }

  const subscription =
    await MyGlobal.prisma.reddit_community_subscriptions.findUnique({
      where: { id: subscriptionId },
      select: {
        id: true,
        reddit_community_user_id: true,
        reddit_community_community_id: true,
      },
    });

  if (!subscription) {
    throw new HttpException(`Subscription not found: ${subscriptionId}`, 404);
  }

  if (subscription.reddit_community_user_id !== user.id) {
    throw new HttpException(
      "Forbidden: cannot delete subscription you do not own.",
      403,
    );
  }

  if (subscription.reddit_community_community_id !== community.id) {
    throw new HttpException(
      "Mismatch: subscription does not belong to specified community.",
      400,
    );
  }

  await MyGlobal.prisma.reddit_community_subscriptions.delete({
    where: { id: subscriptionId },
  });
}
