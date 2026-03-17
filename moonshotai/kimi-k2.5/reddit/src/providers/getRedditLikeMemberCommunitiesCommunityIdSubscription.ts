import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { RedditLikeCommunitySubscriptionTransformer } from "../transformers/RedditLikeCommunitySubscriptionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditLikeMemberCommunitiesCommunityIdSubscription(props: {
  member: AdminPayload;
  communityId: string & tags.Format<"uuid">;
}): Promise<IRedditLikeCommunitySubscription> {
  // Verify community exists first
  await MyGlobal.prisma.reddit_like_communities.findUniqueOrThrow({
    where: { id: props.communityId },
  });
  // Query subscription by composite unique key
  const subscription =
    await MyGlobal.prisma.reddit_like_community_subscriptions.findUnique({
      where: {
        reddit_like_member_id_reddit_like_community_id: {
          reddit_like_member_id: props.member.id,
          reddit_like_community_id: props.communityId,
        },
      },
      ...RedditLikeCommunitySubscriptionTransformer.select(),
    });
  // Return 404 if not subscribed (no record or soft-deleted)
  if (subscription === null || subscription.deleted_at !== null) {
    throw new HttpException("Not subscribed to this community", 404);
  }
  return await RedditLikeCommunitySubscriptionTransformer.transform(
    subscription,
  );
}
