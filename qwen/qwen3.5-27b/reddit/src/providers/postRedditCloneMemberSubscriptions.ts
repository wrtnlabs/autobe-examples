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

export async function postRedditCloneMemberSubscriptions(props: {
  member: MemberPayload;
  body: IRedditCloneCommunitySubscription.ICreate;
}): Promise<IRedditCloneCommunitySubscription> {
  const member = await MyGlobal.prisma.reddit_clone_members.findUniqueOrThrow({
    where: { id: props.member.id },
  });
  const record =
    await MyGlobal.prisma.reddit_clone_community_subscriptions.create({
      data: await RedditCloneCommunitySubscriptionCollector.collect({
        body: props.body,
        redditCloneMembers: member,
      }),
      ...RedditCloneCommunitySubscriptionTransformer.select(),
    });
  return await RedditCloneCommunitySubscriptionTransformer.transform(record);
}
