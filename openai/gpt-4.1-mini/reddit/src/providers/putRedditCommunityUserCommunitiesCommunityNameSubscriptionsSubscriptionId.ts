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

export async function putRedditCommunityUserCommunitiesCommunityNameSubscriptionsSubscriptionId(props: {
  user: UserPayload;
  communityName: string;
  subscriptionId: string & tags.Format<"uuid">;
  body: IRedditCommunitySubscription.IUpdate;
}): Promise<IRedditCommunitySubscription> {
  const { user, communityName, subscriptionId, body } = props;

  const subscription =
    await MyGlobal.prisma.reddit_community_subscriptions.findFirst({
      where: {
        id: subscriptionId,
        reddit_community_user_id: user.id,
        community: {
          name: communityName,
          deleted_at: null,
        },
      },
    });

  if (!subscription) {
    throw new HttpException("Subscription not found or unauthorized", 404);
  }

  const updatedSubscription =
    await MyGlobal.prisma.reddit_community_subscriptions.update({
      where: { id: subscriptionId },
      data: {
        created_at: body.created_at
          ? toISOStringSafe(body.created_at)
          : undefined,
        updated_at: toISOStringSafe(body.updated_at),
      },
    });

  return {
    id: updatedSubscription.id,
    reddit_community_user_id: updatedSubscription.reddit_community_user_id,
    reddit_community_community_id:
      updatedSubscription.reddit_community_community_id,
    created_at: toISOStringSafe(updatedSubscription.created_at),
    updated_at: toISOStringSafe(updatedSubscription.updated_at),
  };
}
