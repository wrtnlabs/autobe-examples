import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeCommunityStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityStatistic";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditLikeGuestCommunitiesCommunityIdStatistics(props: {
  guest: GuestPayload;
  communityId: string & tags.Format<"uuid">;
}): Promise<IRedditLikeCommunityStatistic> {
  // Verify community exists and is not deleted
  await MyGlobal.prisma.reddit_like_communities.findUniqueOrThrow({
    where: { id: props.communityId, deleted_at: null },
  });
  // Count active subscriptions (deleted_at is null)
  const subscriberCount =
    await MyGlobal.prisma.reddit_like_community_subscriptions.count({
      where: {
        reddit_like_community_id: props.communityId,
        deleted_at: null,
      },
    });
  // Count active posts (deleted_at is null)
  const postCount = await MyGlobal.prisma.reddit_like_posts.count({
    where: {
      reddit_like_community_id: props.communityId,
      deleted_at: null,
    },
  });
  // Count active comments (both comment and its post must have deleted_at null)
  const commentCount = await MyGlobal.prisma.reddit_like_comments.count({
    where: {
      post: {
        reddit_like_community_id: props.communityId,
        deleted_at: null,
      },
      deleted_at: null,
    },
  });
  return typia.assert<IRedditLikeCommunityStatistic>({
    subscriber_count: subscriberCount,
    post_count: postCount,
    comment_count: commentCount,
  });
}
