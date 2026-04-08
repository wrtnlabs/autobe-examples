import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunitySubscription";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCloneCommunitySubscriptionCollector } from "../collectors/RedditCloneCommunitySubscriptionCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCloneCommunitySubscriptionTransformer } from "../transformers/RedditCloneCommunitySubscriptionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCloneMemberCommunitiesCommunityIdSubscriptions(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditCloneCommunitySubscription.ICreate;
}): Promise<IRedditCloneCommunitySubscription> {
  // Validate community exists and is not deleted
  const community = await MyGlobal.prisma.reddit_clone_communities.findUnique({
    where: {
      id: props.communityId,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  if (community === null) {
    throw new HttpException("Community not found", 404);
  }
  // Check for existing active subscription
  const existingSubscription =
    await MyGlobal.prisma.reddit_clone_community_subscriptions.findFirst({
      where: {
        reddit_clone_member_id: props.member.id,
        reddit_clone_community_id: props.communityId,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  if (existingSubscription !== null) {
    throw new HttpException("Already subscribed to this community", 409);
  }
  // Create the subscription using Collector and Transformer
  const record =
    await MyGlobal.prisma.reddit_clone_community_subscriptions.create({
      data: await RedditCloneCommunitySubscriptionCollector.collect({
        body: props.body,
        redditCloneMembers: {
          id: props.member.id,
        } satisfies IEntity,
      }),
      ...RedditCloneCommunitySubscriptionTransformer.select(),
    });
  return await RedditCloneCommunitySubscriptionTransformer.transform(record);
}
