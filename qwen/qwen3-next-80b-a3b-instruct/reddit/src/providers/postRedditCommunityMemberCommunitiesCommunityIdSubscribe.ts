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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunitySubscriptionTransformer } from "../transformers/RedditCommunitySubscriptionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCommunityMemberCommunitiesCommunityIdSubscribe(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunitySubscription> {
  // Validate community exists
  await MyGlobal.prisma.reddit_community_communities.findUniqueOrThrow({
    where: { id: props.communityId },
  });
  // Use transformer to select the full required structure
  const selectQuery = RedditCommunitySubscriptionTransformer.select();
  // Attempt to create subscription - let unique constraint handle duplicates
  const created = await MyGlobal.prisma.reddit_community_subscriptions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      user_id: props.member.id,
      community_id: props.communityId,
      created_at: new Date().toISOString() as string & tags.Format<"date-time">,
    },
    select: selectQuery.select,
  });
  // Atomically increment subscriber count using correct field name from schema
  await MyGlobal.prisma.reddit_community_communities.update({
    where: { id: props.communityId },
    data: { subscriberCount: { increment: 1 } },
  });
  // Use transformer to convert Prisma result to API response type
  return await RedditCommunitySubscriptionTransformer.transform(created);
}
