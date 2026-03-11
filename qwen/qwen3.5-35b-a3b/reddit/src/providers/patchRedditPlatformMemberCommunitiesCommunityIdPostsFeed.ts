import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { IRedditPlatformPostFeedRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostFeedRequest";
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

export async function patchRedditPlatformMemberCommunitiesCommunityIdPostsFeed(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditPlatformPostFeedRequest;
}): Promise<IPageIRedditPlatformPost.ISummary> {
  const page = props.body.page ?? 1;
  const limit =
    props.body.pageSize !== undefined
      ? Math.min(props.body.pageSize, 100)
      : 100;
  const skip = (page - 1) * limit;
  if (page < 1) {
    throw new HttpException("Page number must be at least 1", 400);
  }
  // Verify community exists
  await MyGlobal.prisma.reddit_platform_communities.findUniqueOrThrow({
    where: { id: props.communityId },
  });
  // Build ORDER BY based on sortOrder
  const sortOrder = props.body.sortOrder ?? "hot";
  const timeRange = props.body.timeRange ?? "all_time";
  const isSortOrderValid =
    sortOrder === "hot" ||
    sortOrder === "new" ||
    sortOrder === "top" ||
    sortOrder === "controversial";
  const isValidTimeRange =
    timeRange === "today" ||
    timeRange === "this_week" ||
    timeRange === "this_month" ||
    timeRange === "this_year" ||
    timeRange === "all_time";
  let orderByInput: Prisma.reddit_platform_postsOrderByWithRelationInput;
  if (sortOrder === "new") {
    orderByInput = { created_at: "desc" };
  } else if (sortOrder === "top") {
    orderByInput = { vote_score: "desc" };
  } else if (sortOrder === "controversial") {
    orderByInput = { vote_score: "desc", created_at: "desc" };
  } else {
    orderByInput = { created_at: "desc" };
  }
  // Build WHERE filter with timeRange for top sorting
  let whereInput: Prisma.reddit_platform_postsWhereInput = {
    reddit_platform_community_id: props.communityId,
    deleted_at: null,
  };
  if (sortOrder === "top" && isValidTimeRange && timeRange !== "all_time") {
    const now = new Date();
    let cutoffDate: Date;
    switch (timeRange) {
      case "today":
        cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case "this_week":
        cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "this_month":
        cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "this_year":
        cutoffDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        cutoffDate = now;
    }
    whereInput = {
      ...whereInput,
      created_at: { gte: cutoffDate },
    };
  }
  const data = await MyGlobal.prisma.reddit_platform_posts.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...RedditPlatformPostAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_platform_posts.count({
    where: whereInput,
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
