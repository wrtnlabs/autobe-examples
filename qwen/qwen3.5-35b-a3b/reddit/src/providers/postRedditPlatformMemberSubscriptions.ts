import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditPlatformCommunitySubscriptionCollector } from "../collectors/RedditPlatformCommunitySubscriptionCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformCommunitySubscriptionTransformer } from "../transformers/RedditPlatformCommunitySubscriptionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditPlatformMemberSubscriptions(props: {
  member: MemberPayload;
  body: IRedditPlatformCommunitySubscription.ICreate;
}): Promise<IRedditPlatformCommunitySubscription> {
  // Step 1: Validate community exists and is not deleted
  const community =
    await MyGlobal.prisma.reddit_platform_communities.findUniqueOrThrow({
      where: {
        id: props.body.reddit_platform_community_id,
        deleted_at: null,
      },
    });
  // Step 2: Check for existing subscription (return 409 if duplicate)
  const existingSubscription =
    await MyGlobal.prisma.reddit_platform_community_subscriptions.findFirst({
      where: {
        reddit_platform_member_id: props.member.id,
        reddit_platform_community_id: props.body.reddit_platform_community_id,
        deleted_at: null,
      },
    });
  if (existingSubscription !== null) {
    throw new HttpException("Already subscribed to this community", 409);
  }
  // Step 3: Create subscription with collector
  const created =
    await MyGlobal.prisma.reddit_platform_community_subscriptions.create({
      data: await RedditPlatformCommunitySubscriptionCollector.collect({
        body: props.body,
        redditPlatformMembers: {
          id: props.member.id,
        },
      }),
      ...RedditPlatformCommunitySubscriptionTransformer.select(),
    });
  // Step 4: Return transformed response
  return await RedditPlatformCommunitySubscriptionTransformer.transform(
    created,
  );
}
