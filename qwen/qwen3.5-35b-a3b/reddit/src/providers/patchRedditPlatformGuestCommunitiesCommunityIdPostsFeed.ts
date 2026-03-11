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
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { RedditPlatformPostAtSummaryTransformer } from "../transformers/RedditPlatformPostAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformGuestCommunitiesCommunityIdPostsFeed(props: {
  guest: GuestPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditPlatformPostFeedRequest;
}): Promise<IPageIRedditPlatformPost.ISummary> {
  // Validate and resolve pagination
  const page = props.body.page ?? 1;
  const pageSize = props.body.pageSize ?? 100;
  const normalizedPage = page < 1 ? 1 : page;
  const normalizedPageSize = pageSize < 1 ? 1 : pageSize > 100 ? 100 : pageSize;
  const skip = (normalizedPage - 1) * normalizedPageSize;
  // Validate and resolve sorting
  const sortOrder = props.body.sortOrder ?? "hot";
  const validSortOrders: Array<"hot" | "new" | "top" | "controversial"> = [
    "hot",
    "new",
    "top",
    "controversial",
  ];
  const normalizedSortOrder = validSortOrders.includes(sortOrder as any)
    ? sortOrder
    : "hot";
  // Validate and resolve time range (only for top)
  const timeRange = props.body.timeRange ?? "all_time";
  const validTimeRanges: Array<
    "today" | "this_week" | "this_month" | "this_year" | "all_time"
  > = ["today", "this_week", "this_month", "this_year", "all_time"];
  const normalizedTimeRange = validTimeRanges.includes(timeRange as any)
    ? timeRange
    : "all_time";
  // Verify community exists
  const community =
    await MyGlobal.prisma.reddit_platform_communities.findUnique({
      where: {
        id: props.communityId,
        deleted_at: null,
      },
    });
  if (community === null) {
    throw new HttpException("Community not found", 404);
  }
  // Build where clause based on community
  const whereInput: Prisma.reddit_platform_postsWhereInput = {
    reddit_platform_community_id: props.communityId,
    deleted_at: null,
  };
  // Apply time range filter for 'top' sorting
  if (normalizedSortOrder === "top" && normalizedTimeRange !== "all_time") {
    const nowIso = new Date().toISOString();
    const nowDate = new Date(nowIso);
    let dateThreshold: Date;
    switch (normalizedTimeRange) {
      case "today":
        dateThreshold = new Date(nowDate.getTime() - 24 * 60 * 60 * 1000);
        break;
      case "this_week":
        dateThreshold = new Date(nowDate.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "this_month":
        dateThreshold = new Date(nowDate.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "this_year":
        dateThreshold = new Date(nowDate.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        dateThreshold = new Date(0);
    }
    whereInput.created_at = { gte: dateThreshold };
  }
  // Build order by clause based on sort order
  let orderByInput: Prisma.reddit_platform_postsOrderByWithRelationInput;
  switch (normalizedSortOrder) {
    case "hot":
      // Hot: recent activity weighted by engagement (created_at desc, vote_score desc)
      orderByInput = {
        vote_score: "desc",
      } satisfies Prisma.reddit_platform_postsOrderByWithRelationInput;
      break;
    case "new":
      // New: chronological by created_at desc
      orderByInput = {
        created_at: "desc",
      } satisfies Prisma.reddit_platform_postsOrderByWithRelationInput;
      break;
    case "top":
      // Top: highest vote scores
      orderByInput = {
        vote_score: "desc",
      } satisfies Prisma.reddit_platform_postsOrderByWithRelationInput;
      break;
    case "controversial":
      // Controversial: high total votes with score near zero (not available in simple schema, default to vote_score desc)
      orderByInput = {
        vote_score: "asc",
      } satisfies Prisma.reddit_platform_postsOrderByWithRelationInput;
      break;
    default:
      orderByInput = {
        vote_score: "desc",
      } satisfies Prisma.reddit_platform_postsOrderByWithRelationInput;
  }
  // Query posts with relations
  const data = await MyGlobal.prisma.reddit_platform_posts.findMany({
    where: whereInput,
    skip,
    take: normalizedPageSize,
    orderBy: orderByInput,
    ...RedditPlatformPostAtSummaryTransformer.select(),
  });
  // Get total count
  const total = await MyGlobal.prisma.reddit_platform_posts.count({
    where: whereInput,
  });
  // Transform and return paginated result
  return {
    data: await ArrayUtil.asyncMap(
      data,
      RedditPlatformPostAtSummaryTransformer.transform,
    ),
    pagination: {
      current: normalizedPage,
      limit: normalizedPageSize,
      records: total,
      pages: Math.ceil(total / normalizedPageSize),
    } satisfies IPage.IPagination,
  };
}
