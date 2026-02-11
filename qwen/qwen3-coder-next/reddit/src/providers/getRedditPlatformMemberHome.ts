import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformPostAtSummaryTransformer } from "../transformers/RedditPlatformPostAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformMemberHome(props: {
  member: MemberPayload;
}): Promise<IPageIRedditPlatformPost.ISummary> {
  const page = 1;
  const limit = 20;
  const skip = (page - 1) * limit;
  // Get subscribed community IDs for this member
  const subscriptions =
    await MyGlobal.prisma.reddit_platform_subscriptions.findMany({
      where: { user_id: props.member.id },
      select: { community_id: true },
    });
  if (subscriptions.length === 0) {
    return {
      data: [],
      pagination: {
        current: page,
        limit: limit,
        records: 0,
        pages: 0,
      } satisfies IPage.IPagination,
    };
  }
  const communityIds = subscriptions.map((s) => s.community_id);
  // Query posts from subscribed communities
  const data = await MyGlobal.prisma.reddit_platform_posts.findMany({
    where: {
      community_id: { in: communityIds },
      deleted_at: null,
    },
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...RedditPlatformPostAtSummaryTransformer.select(),
  });
  // Count total posts from subscribed communities
  const total = await MyGlobal.prisma.reddit_platform_posts.count({
    where: {
      community_id: { in: communityIds },
      deleted_at: null,
    },
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      RedditPlatformPostAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
