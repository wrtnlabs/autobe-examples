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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditLikeCommunitySubscriptionTransformer } from "../transformers/RedditLikeCommunitySubscriptionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditLikeMemberCommunitiesCommunityIdSubscriptions(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
}): Promise<IRedditLikeCommunitySubscription> {
  // Validate community exists
  await MyGlobal.prisma.reddit_like_communities.findUniqueOrThrow({
    where: { id: props.communityId },
  });
  // Check for existing active subscription
  const existingSubscription =
    await MyGlobal.prisma.reddit_like_community_subscriptions.findFirst({
      where: {
        reddit_like_member_id: props.member.id,
        reddit_like_community_id: props.communityId,
        deleted_at: null,
      },
    });
  if (existingSubscription !== null) {
    throw new HttpException(
      "Member is already subscribed to this community",
      409,
    );
  }
  const now = new Date().toISOString();
  // Create new subscription
  const created =
    await MyGlobal.prisma.reddit_like_community_subscriptions.create({
      data: {
        id: v4(),
        reddit_like_member_id: props.member.id,
        reddit_like_community_id: props.communityId,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
  // Fetch with full relations using transformer select
  const subscription =
    await MyGlobal.prisma.reddit_like_community_subscriptions.findUniqueOrThrow(
      {
        where: { id: created.id },
        ...RedditLikeCommunitySubscriptionTransformer.select(),
      },
    );
  return await RedditLikeCommunitySubscriptionTransformer.transform(
    subscription,
  );
}
