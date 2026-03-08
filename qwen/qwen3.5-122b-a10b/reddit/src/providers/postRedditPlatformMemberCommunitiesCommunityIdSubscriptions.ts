import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import { IRedditPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFile";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformCommunitySubscriptionTransformer } from "../transformers/RedditPlatformCommunitySubscriptionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditPlatformMemberCommunitiesCommunityIdSubscriptions(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
}): Promise<IRedditPlatformCommunitySubscription> {
  // Verify community exists and is not deleted
  const community =
    await MyGlobal.prisma.reddit_platform_communities.findUniqueOrThrow({
      where: {
        id: props.communityId,
        deleted_at: null,
      },
      select: {
        id: true,
        subscriber_count: true,
      },
    });
  // Check for existing active subscription
  const existing =
    await MyGlobal.prisma.reddit_platform_community_subscriptions.findFirst({
      where: {
        member_id: props.member.id,
        community_id: props.communityId,
        deleted_at: null,
      },
    });
  if (existing !== null) {
    throw new HttpException("Already subscribed to this community", 409);
  }
  // Create subscription record
  const subscription =
    await MyGlobal.prisma.reddit_platform_community_subscriptions.create({
      data: {
        id: v4(),
        member_id: props.member.id,
        community_id: props.communityId,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
    });
  // Atomically increment subscriber count
  await MyGlobal.prisma.reddit_platform_communities.update({
    where: { id: props.communityId },
    data: { subscriber_count: { increment: 1 } },
  });
  // Fetch and transform with full relation data
  const fullSubscription =
    await MyGlobal.prisma.reddit_platform_community_subscriptions.findUniqueOrThrow(
      {
        where: { id: subscription.id },
        ...RedditPlatformCommunitySubscriptionTransformer.select(),
      } satisfies Prisma.reddit_platform_community_subscriptionsFindManyArgs,
    );
  return await RedditPlatformCommunitySubscriptionTransformer.transform(
    fullSubscription,
  );
}
