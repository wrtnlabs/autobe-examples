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
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { RedditPlatformPostAtSummaryTransformer } from "../transformers/RedditPlatformPostAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformGuestPostsFeedPopular(props: {
  guest: GuestPayload;
  body: IRedditPlatformPost.IRequest;
}): Promise<IPageIRedditPlatformPost.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  // Validate pagination parameters
  const validatedPage = page < 1 ? 1 : page;
  const validatedLimit = limit > 100 ? 100 : limit < 1 ? 1 : limit;
  const validatedSkip = (validatedPage - 1) * validatedLimit;
  // Build where clause - exclude soft-deleted posts
  const whereInput: Prisma.reddit_platform_postsWhereInput = {
    deleted_at: null,
  } satisfies Prisma.reddit_platform_postsWhereInput;
  // Apply time range filter for 'top' sort
  if (props.body.sortBy === "top" && props.body.timeRange) {
    const now = new Date();
    const startDate: Date | null = (() => {
      switch (props.body.timeRange) {
        case "today":
          return new Date(now.getFullYear(), now.getMonth(), now.getDate());
        case "this_week":
          const startOfWeek = new Date(now);
          startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
          startOfWeek.setHours(0, 0, 0, 0);
          return startOfWeek;
        case "this_month":
          return new Date(now.getFullYear(), now.getMonth(), 1);
        case "this_year":
          return new Date(now.getFullYear(), 0, 1);
        case "all_time":
        default:
          return null;
      }
    })();
    if (startDate !== null) {
      whereInput.created_at = { gte: startDate };
    }
  }
  // Filter controversial posts to those with vote_score near zero
  // Using threshold of -10 to 10 to identify polarizing content
  if (props.body.sortBy === "controversial") {
    whereInput.vote_score = {
      gte: -10,
      lte: 10,
    };
  }
  // Build order by clause
  const orderByInput: Prisma.reddit_platform_postsOrderByWithRelationInput[] =
    (() => {
      switch (props.body.sortBy) {
        case "hot":
          // Hot: prioritize high vote scores, then recent
          return [
            { vote_score: "desc" as const },
            { created_at: "desc" as const },
          ];
        case "new":
          return [{ created_at: "desc" as const }];
        case "top":
          return [{ vote_score: "desc" as const }];
        case "controversial":
          // Controversial: lowest scores first (near zero)
          return [{ vote_score: "asc" as const }];
        default:
          return [{ created_at: "desc" as const }];
      }
    })() satisfies Prisma.reddit_platform_postsOrderByWithRelationInput[];
  // Fetch posts with author and community relations
  const posts = await MyGlobal.prisma.reddit_platform_posts.findMany({
    where: whereInput,
    skip: validatedSkip,
    take: validatedLimit,
    orderBy: orderByInput,
    ...RedditPlatformPostAtSummaryTransformer.select(),
  });
  // Count total records for pagination metadata
  const total = await MyGlobal.prisma.reddit_platform_posts.count({
    where: whereInput,
  });
  // Transform posts to response format
  const transformedData = await ArrayUtil.asyncMap(
    posts,
    RedditPlatformPostAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: validatedPage,
      limit: validatedLimit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / validatedLimit),
    } satisfies IPage.IPagination,
  } satisfies IPageIRedditPlatformPost.ISummary;
}
