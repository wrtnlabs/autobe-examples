import { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { ICommunityPostFeed } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPostFeed";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPostFeeds(props: {
  body: ICommunityPostFeed.IRequest;
}): Promise<ICommunityPostFeed.IResponse> {
  // Since IRequest is empty, access properties using bracket notation and type assertion
  const body = props.body as Record<string, any>;
  const feed_type = body.feed_type;
  const sort_algorithm = body.sort_algorithm;
  const page_token = body.page_token;
  const month_partition = body.month_partition;
  // Validate feed_type enum
  if (!feed_type || !["home", "popular", "community"].includes(feed_type)) {
    throw new HttpException(
      "Invalid feed_type. Must be one of: home, popular, community",
      400,
    );
  }
  // Validate sort_algorithm enum
  if (
    !sort_algorithm ||
    !["hot", "new", "top", "controversial"].includes(sort_algorithm)
  ) {
    throw new HttpException(
      "Invalid sort_algorithm. Must be one of: hot, new, top, controversial",
      400,
    );
  }
  // Validate page_token is non-empty string
  if (
    !page_token ||
    typeof page_token !== "string" ||
    page_token.trim() === ""
  ) {
    throw new HttpException("page_token must be a non-empty string", 400);
  }
  // Validate month_partition format (YYYY-MM)
  const monthRegex = /^\d{4}-\d{2}$/;
  if (
    !month_partition ||
    typeof month_partition !== "string" ||
    !monthRegex.test(month_partition)
  ) {
    throw new HttpException("month_partition must be in YYYY-MM format", 400);
  }
  // Query cache entry
  const cacheEntry =
    await MyGlobal.prisma.community_mv_feed_cache_entries.findUnique({
      where: {
        feed_type_sort_algorithm_page_token_month_partition: {
          feed_type,
          sort_algorithm,
          page_token,
          month_partition,
        },
      },
    });
  // Return 404 if not found
  if (!cacheEntry) {
    throw new HttpException("Cached feed not found", 404);
  }
  // Parse payload and enforce ICommunityPostFeed.IResponse structure without type assertion
  const parsed = JSON.parse(cacheEntry.payload);
  // Validate structure and re-construct with correct typing
  if (!Array.isArray(parsed)) {
    throw new HttpException("Cached feed payload is not an array", 500);
  }
  // Transform each item in array to enforce ICommunityPostFeed.IResponse type correctly
  // Assume payload contains array of posts and use first one to enforce ICommunityPostFeed.IResponse
  if (parsed.length === 0) {
    throw new HttpException("Cached feed is empty", 500);
  }
  const firstPost = parsed[0];
  // Validate single post structure
  if (typeof firstPost.id !== "string" || !firstPost.id) {
    throw new HttpException("Invalid post id in cache payload", 500);
  }
  if (typeof firstPost.title !== "string" || !firstPost.title) {
    throw new HttpException("Invalid post title in cache payload", 500);
  }
  if (
    !firstPost.author ||
    typeof firstPost.author.id !== "string" ||
    !firstPost.author.id
  ) {
    throw new HttpException("Invalid author object in cache payload", 500);
  }
  if (
    !firstPost.community ||
    typeof firstPost.community.id !== "string" ||
    !firstPost.community.id
  ) {
    throw new HttpException("Invalid community object in cache payload", 500);
  }
  if (typeof firstPost.vote_score !== "number") {
    throw new HttpException("Invalid vote_score in cache payload", 500);
  }
  if (typeof firstPost.comment_count !== "number") {
    throw new HttpException("Invalid comment_count in cache payload", 500);
  }
  if (typeof firstPost.content_preview !== "string") {
    throw new HttpException("Invalid content_preview in cache payload", 500);
  }
  // Return single post object with proper branded types
  return {
    id: firstPost.id as string & tags.Format<"uuid">,
    title: firstPost.title,
    author: firstPost.author,
    community: firstPost.community,
    vote_score: firstPost.vote_score as number & tags.Type<"int32">,
    comment_count: firstPost.comment_count as number & tags.Type<"int32">,
    content_preview: firstPost.content_preview,
  };
}
