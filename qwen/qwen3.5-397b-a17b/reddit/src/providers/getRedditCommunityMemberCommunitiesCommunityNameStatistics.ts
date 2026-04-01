import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCommunityMemberCommunitiesCommunityNameStatistics(props: {
  member: MemberPayload;
  communityName: string;
}): Promise<IRedditCommunityCommunity.IStatistic> {
  const community =
    await MyGlobal.prisma.reddit_community_communities.findFirstOrThrow({
      where: {
        name: props.communityName,
        deleted_at: null,
      },
    });
  const subscriberCount =
    await MyGlobal.prisma.reddit_community_subscriptions.count({
      where: {
        community_id: community.id,
      },
    });
  const postCount = await MyGlobal.prisma.reddit_community_posts.count({
    where: {
      reddit_community_community_id: community.id,
      deleted_at: null,
    },
  });
  return {
    subscriber_count: subscriberCount,
    post_count: postCount,
  } satisfies IRedditCommunityCommunity.IStatistic;
}
