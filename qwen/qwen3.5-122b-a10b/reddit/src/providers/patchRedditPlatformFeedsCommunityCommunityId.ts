import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFile";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditPlatformPostAtSummaryTransformer } from "../transformers/RedditPlatformPostAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformFeedsCommunityCommunityId(props: {
  communityId: string & tags.Format<"uuid">;
  body: IRedditPlatformPost.IRequest;
}): Promise<IPageIRedditPlatformPost.ISummary> {
  // Validate community exists and is not deleted
  await MyGlobal.prisma.reddit_platform_communities.findUniqueOrThrow({
    where: { id: props.communityId, deleted_at: null },
  });
  // Build where clause
  const whereInput: Prisma.reddit_platform_postsWhereInput = {
    community_id: props.communityId,
    deleted_at: null,
    ...(props.body.search && {
      OR: [
        { title: { contains: props.body.search, mode: "insensitive" } },
        { text_content: { contains: props.body.search, mode: "insensitive" } },
      ],
    }),
  } satisfies Prisma.reddit_platform_postsWhereInput;
  // Pagination parameters
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  // Build orderBy based on sort_by parameter
  let orderByInput: Prisma.reddit_platform_postsOrderByWithRelationInput;
  if (props.body.sort_by === "new") {
    orderByInput = { created_at: "desc" };
  } else if (props.body.sort_by === "top") {
    if (!props.body.time_filter) {
      throw new HttpException("time_filter is required for top sorting", 400);
    }
    // For top sorting, we still order by created_at desc but filter by time
    orderByInput = { created_at: "desc" };
  } else if (props.body.sort_by === "controversial") {
    orderByInput = { created_at: "desc" };
  } else {
    // hot or default
    orderByInput = { created_at: "desc" };
  }
  // Apply time filter for top sorting
  if (props.body.sort_by === "top" && props.body.time_filter) {
    const now = new Date();
    let timeBoundary: Date;
    switch (props.body.time_filter) {
      case "today":
        timeBoundary = new Date(now);
        timeBoundary.setHours(0, 0, 0, 0);
        break;
      case "week":
        timeBoundary = new Date(now);
        timeBoundary.setDate(timeBoundary.getDate() - 7);
        break;
      case "month":
        timeBoundary = new Date(now);
        timeBoundary.setMonth(timeBoundary.getMonth() - 1);
        break;
      case "year":
        timeBoundary = new Date(now);
        timeBoundary.setFullYear(timeBoundary.getFullYear() - 1);
        break;
      case "all_time":
      default:
        timeBoundary = new Date(0);
        break;
    }
    whereInput.created_at = { gte: timeBoundary };
  }
  // Query posts with transformer select
  const posts = await MyGlobal.prisma.reddit_platform_posts.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    ...RedditPlatformPostAtSummaryTransformer.select(),
  } satisfies Prisma.reddit_platform_postsFindManyArgs);
  // Get total count
  const total = await MyGlobal.prisma.reddit_platform_posts.count({
    where: whereInput,
  });
  // Transform posts using transformer
  const data = await Promise.all(
    posts.map((post) => RedditPlatformPostAtSummaryTransformer.transform(post)),
  );
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data,
  } satisfies IPageIRedditPlatformPost.ISummary;
}
