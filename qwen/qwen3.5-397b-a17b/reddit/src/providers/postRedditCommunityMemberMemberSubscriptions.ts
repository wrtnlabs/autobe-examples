import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCommunitySubscriptionCollector } from "../collectors/RedditCommunitySubscriptionCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunitySubscriptionTransformer } from "../transformers/RedditCommunitySubscriptionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCommunityMemberMemberSubscriptions(props: {
  member: MemberPayload;
  body: IRedditCommunitySubscription.ICreate;
}): Promise<IRedditCommunitySubscription> {
  await MyGlobal.prisma.reddit_community_communities.findUniqueOrThrow({
    where: { id: props.body.community_id },
  });
  const existing =
    await MyGlobal.prisma.reddit_community_subscriptions.findFirst({
      where: {
        member_id: props.member.id,
        community_id: props.body.community_id,
        deleted_at: null,
      },
    });
  if (existing !== null) {
    throw new HttpException("Already subscribed to this community", 409);
  }
  const created = await MyGlobal.prisma.reddit_community_subscriptions.create({
    data: await RedditCommunitySubscriptionCollector.collect({
      body: props.body,
      redditCommunityMembers: { id: props.member.id },
    }),
    ...RedditCommunitySubscriptionTransformer.select(),
  });
  return await RedditCommunitySubscriptionTransformer.transform(created);
}
