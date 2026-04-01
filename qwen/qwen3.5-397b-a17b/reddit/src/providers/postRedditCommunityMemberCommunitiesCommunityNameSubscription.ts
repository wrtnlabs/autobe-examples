import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
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

export async function postRedditCommunityMemberCommunitiesCommunityNameSubscription(props: {
  member: MemberPayload;
  communityName: string;
}): Promise<IRedditCommunitySubscription> {
  const community =
    await MyGlobal.prisma.reddit_community_communities.findFirstOrThrow({
      where: {
        name: props.communityName,
        deleted_at: null,
      },
      select: { id: true },
    });
  const existing =
    await MyGlobal.prisma.reddit_community_subscriptions.findUnique({
      where: {
        member_id_community_id: {
          member_id: props.member.id,
          community_id: community.id,
        },
      },
    });
  if (existing) {
    throw new HttpException("Already subscribed to this community", 409);
  }
  const created = await MyGlobal.prisma.reddit_community_subscriptions.create({
    data: {
      id: v4(),
      member_id: props.member.id,
      community_id: community.id,
      created_at: new Date(),
    },
    ...RedditCommunitySubscriptionTransformer.select(),
  });
  return await RedditCommunitySubscriptionTransformer.transform(created);
}
