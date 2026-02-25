import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunity";
import { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { IRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunitySubscriptionAtSummaryTransformer } from "../transformers/RedditCommunitySubscriptionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditMemberCommunitiesCommunityIdSubscribe(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunitySubscription.ISummary> {
  const community = await MyGlobal.prisma.reddit_communities.findUniqueOrThrow({
    where: { id: props.communityId, deleted_at: null },
  });
  const existingSubscription =
    await MyGlobal.prisma.reddit_community_subscriptions.findFirst({
      where: {
        community_id: props.communityId,
        member_id: props.member.id,
        deleted_at: null,
      },
    });
  if (existingSubscription) {
    throw new HttpException("Already subscribed to this community", 409);
  }
  const createdSubscription =
    await MyGlobal.prisma.reddit_community_subscriptions.create({
      data: {
        id: v4(),
        community_id: props.communityId,
        member_id: props.member.id,
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
        deleted_at: null,
      },
      ...RedditCommunitySubscriptionAtSummaryTransformer.select(),
    });
  return await RedditCommunitySubscriptionAtSummaryTransformer.transform(
    createdSubscription,
  );
}
