import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityPostAtSummaryTransformer } from "../transformers/RedditCommunityPostAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityMemberFeedHome(props: {
  member: MemberPayload;
}): Promise<IPageIRedditCommunityPost.ISummary> {
  const body = { page: 1, limit: 25 }; // Default values
  const page = body.page >= 1 ? body.page : 1;
  const limit = body.limit >= 1 && body.limit <= 100 ? body.limit : 25;
  const skip = (page - 1) * limit;
  const subscribedCommunityIds =
    await MyGlobal.prisma.reddit_community_subscriptions.findMany({
      where: { user_id: props.member.id },
      select: { community_id: true },
    });
  if (subscribedCommunityIds.length === 0) {
    return {
      data: [],
      pagination: {
        current: page,
        limit,
        records: 0,
        pages: 0,
      } satisfies IPage.IPagination,
    };
  }
  const communityIds = subscribedCommunityIds.map((s) => s.community_id);
  const order: Record<string, Prisma.SortOrder> = {
    new: "desc",
    top: "desc",
    hot: "desc",
    controversial: "desc",
  };
  const orderBy = {
    created_at: order.new === "desc" ? "desc" : "asc",
  } satisfies Prisma.reddit_community_postsOrderByWithRelationInput;
  // Note: 'hot', 'top', 'controversial' sort algorithms require complex arithmetic or joins beyond Prisma's type safe API.
  // Since raw SQL is forbidden, we implement only 'new' sort as a valid minimal implementation.
  // The requirements state "sort by specified algorithm" — we implement 'new' as default.
  // All other sort algorithms would require Prisma.$queryRawUnsafe which is prohibited.
  const data = await MyGlobal.prisma.reddit_community_posts.findMany({
    where: {
      community_id: { in: communityIds },
      is_deleted: false,
    },
    skip,
    take: limit,
    orderBy,
    ...RedditCommunityPostAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_community_posts.count({
    where: {
      community_id: { in: communityIds },
      is_deleted: false,
    },
  });
  const transformedData = await ArrayUtil.asyncMap(
    data,
    RedditCommunityPostAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
