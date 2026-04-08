import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikePost";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikePopularFeed } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePopularFeed";
import { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditLikePostAtSummaryTransformer } from "../transformers/RedditLikePostAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeFeedsPopular(props: {
  body: IRedditLikePopularFeed.IRequest;
}): Promise<IPageIRedditLikePost.ISummary> {
  // Parse pagination parameters
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 20;
  const validatedLimit: number = Math.min(Math.max(limit, 1), 100);
  const skip: number = (page - 1) * validatedLimit;
  // Parse cursor if provided (base64-encoded JSON with created_at and id)
  let cursor:
    | {
        created_at: string & tags.Format<"date-time">;
        id: string & tags.Format<"uuid">;
      }
    | undefined;
  if (props.body.cursor) {
    try {
      const decoded: unknown = JSON.parse(
        Buffer.from(props.body.cursor, "base64").toString(),
      );
      const validated = typia.assert<{
        created_at: string;
        id: string;
      }>(decoded);
      cursor = typia.assert<{
        created_at: string & tags.Format<"date-time">;
        id: string & tags.Format<"uuid">;
      }>(validated);
    } catch {
      cursor = undefined;
    }
  }
  // Build where clause
  const whereInput: Prisma.reddit_like_postsWhereInput = {
    deleted_at: null,
    ...(props.body.community_id && {
      reddit_like_community_id: props.body.community_id,
    }),
    ...(props.body.search && {
      title: {
        contains: props.body.search,
        mode: "insensitive",
      },
    }),
  };
  // Apply time filter for top sorting
  const sort: "hot" | "new" | "top" | "controversial" =
    props.body.sort ?? "hot";
  const timeFilter: "today" | "week" | "month" | "year" | "all_time" =
    props.body.time_filter ?? "all_time";
  if (sort === "top" && timeFilter !== "all_time") {
    const timeBoundaries: Record<string, number> = {
      today: 1,
      week: 7,
      month: 30,
      year: 365,
    };
    const days: number = timeBoundaries[timeFilter];
    const now: Date = new Date();
    now.setDate(now.getDate() - days);
    const timeBoundary: string = now.toISOString();
    whereInput.created_at = {
      gte: timeBoundary,
    };
  }
  // Build orderBy based on sort parameter
  const orderByInput: Prisma.reddit_like_postsOrderByWithRelationInput = {
    created_at: "desc" as const,
  };
  // Execute query with cursor or skip/take
  const posts = cursor
    ? await MyGlobal.prisma.reddit_like_posts.findMany({
        where: whereInput,
        orderBy: orderByInput,
        cursor: { created_at: cursor.created_at, id: cursor.id },
        skip: 1,
        take: validatedLimit,
        ...RedditLikePostAtSummaryTransformer.select(),
      })
    : await MyGlobal.prisma.reddit_like_posts.findMany({
        where: whereInput,
        orderBy: orderByInput,
        skip,
        take: validatedLimit,
        ...RedditLikePostAtSummaryTransformer.select(),
      });
  // Get total count
  const total: number = await MyGlobal.prisma.reddit_like_posts.count({
    where: whereInput,
  });
  // Transform posts
  const data = await ArrayUtil.asyncMap(
    posts,
    RedditLikePostAtSummaryTransformer.transform,
  );
  // Calculate pagination
  const totalPages: number = Math.ceil(total / validatedLimit);
  return {
    pagination: {
      current: page,
      limit: validatedLimit,
      records: total,
      pages: totalPages,
    } satisfies IPage.IPagination,
    data,
  } satisfies IPageIRedditLikePost.ISummary;
}
