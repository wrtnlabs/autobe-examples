import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneContentPost";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentPost";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCloneContentPostAtSummaryTransformer } from "../transformers/RedditCloneContentPostAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditClonePostsPopular(): Promise<IPageIRedditCloneContentPost.ISummary> {
  // Default pagination values
  const page = 1;
  const limit = 20;
  const skip = (page - 1) * limit;
  // Default sorting to 'new' as per typical feed behavior
  const sort: "hot" | "new" | "top" | "controversial" = "new";
  const time: "day" | "week" | "month" | "year" | "all" = "all";
  // Build where condition
  const whereCondition = {
    deleted_at: null,
  } satisfies Prisma.reddit_clone_content_postsWhereInput;
  // Build order by based on sort algorithm
  const orderBy: Prisma.reddit_clone_content_postsOrderByWithRelationInput =
    sort === "new"
      ? { created_at: "desc" }
      : sort === "hot"
        ? { vote_score: "desc", created_at: "desc" }
        : sort === "top"
          ? { vote_score: "desc" }
          : { vote_score: "asc", created_at: "desc" };
  // Fetch posts with transformer select
  const data = await MyGlobal.prisma.reddit_clone_content_posts.findMany({
    where: whereCondition,
    skip,
    take: limit,
    orderBy,
    ...RedditCloneContentPostAtSummaryTransformer.select(),
  });
  // Count total records
  const total = await MyGlobal.prisma.reddit_clone_content_posts.count({
    where: whereCondition,
  });
  // Transform results
  const transformed = await ArrayUtil.asyncMap(
    data,
    RedditCloneContentPostAtSummaryTransformer.transform,
  );
  // Calculate pagination
  const pages = Math.ceil(total / limit);
  return {
    data: transformed,
    pagination: {
      current: page,
      limit,
      records: total,
      pages,
    } satisfies IPage.IPagination,
  } satisfies IPageIRedditCloneContentPost.ISummary;
}
