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

export async function patchRedditPlatformFeedsPopular(props: {
  body: IRedditPlatformPost.IRequest;
}): Promise<IPageIRedditPlatformPost.ISummary> {
  // Pagination parameters
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  // Build WHERE clause
  const whereInput: Prisma.reddit_platform_postsWhereInput = {
    deleted_at: null,
    ...(props.body.search && {
      OR: [
        { title: { contains: props.body.search, mode: "insensitive" } },
        { text_content: { contains: props.body.search, mode: "insensitive" } },
      ],
    }),
  };
  // Build ORDERBY clause based on sort_by
  const sort_by = props.body.sort_by ?? "hot";
  const time_filter = props.body.time_filter;
  let orderByInput: Prisma.reddit_platform_postsOrderByWithRelationInput;
  if (sort_by === "new") {
    orderByInput = { created_at: "desc" };
  } else if (sort_by === "top") {
    if (!time_filter) {
      throw new HttpException("time_filter is required for top sorting", 400);
    }
    // For top sorting, we order by created_at DESC (vote_score computed in transformer)
    orderByInput = { created_at: "desc" };
  } else if (sort_by === "controversial") {
    // For controversial, order by created_at DESC (vote metrics computed in transformer)
    orderByInput = { created_at: "desc" };
  } else {
    // hot (default) - order by created_at DESC as fallback
    orderByInput = { created_at: "desc" };
  }
  // Apply time filter for top sorting
  if (sort_by === "top" && time_filter) {
    const now = new Date();
    let timeBoundary: Date;
    switch (time_filter) {
      case "today":
        timeBoundary = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
        );
        break;
      case "week":
        timeBoundary = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        timeBoundary = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "year":
        timeBoundary = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      case "all_time":
      default:
        timeBoundary = new Date(0);
        break;
    }
    whereInput.created_at = { gte: timeBoundary };
  }
  // Execute queries sequentially
  const posts = await MyGlobal.prisma.reddit_platform_posts.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...RedditPlatformPostAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_platform_posts.count({
    where: whereInput,
  });
  // Transform posts using ArrayUtil.asyncMap
  const data = await ArrayUtil.asyncMap(
    posts,
    RedditPlatformPostAtSummaryTransformer.transform,
  );
  // Build response
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
