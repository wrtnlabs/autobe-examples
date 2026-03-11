import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditLikeSearchResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeSearchResult";
import { IRedditLikeContentSearch } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeContentSearch";
import { IRedditLikeSearchResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeSearchResult";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeAdminSearchContent(props: {
  admin: AdminPayload;
  body: IRedditLikeContentSearch.IRequest;
}): Promise<IPageIRedditLikeSearchResult.ISummary> {
  const page = Math.max(1, props.body.page ?? 1);
  const limit = Math.min(100, Math.max(1, props.body.limit ?? 20));
  const skip = (page - 1) * limit;
  const query = props.body.query;
  const communityId = props.body.community_id;
  const typeFilter = props.body.type;
  const sort = props.body.sort ?? "relevance";
  // Build post WHERE conditions
  const postWhere: Prisma.reddit_like_postsWhereInput = {
    deleted_at: null,
    ...(communityId && { community_id: communityId }),
  };
  // Full-text search on title and content
  if (query) {
    postWhere.OR = [
      { title: { contains: query } },
      { content: { contains: query } },
    ];
  }
  // Filter by type
  if (typeFilter) {
    postWhere.type = typeFilter;
  }
  // Parse date range
  const startDate = props.body.start_date
    ? new Date(props.body.start_date)
    : null;
  const endDate = props.body.end_date ? new Date(props.body.end_date) : null;
  // Filter by date range
  if (startDate || endDate) {
    postWhere.created_at = {};
    if (startDate) postWhere.created_at.gte = startDate;
    if (endDate) postWhere.created_at.lte = endDate;
  }
  // Build comment WHERE conditions
  const commentWhere: Prisma.reddit_like_commentsWhereInput = {
    deleted_at: null,
  };
  // Full-text search on content
  if (query) {
    commentWhere.content = { contains: query };
  }
  // Filter by community
  if (communityId) {
    commentWhere.post = { community_id: communityId };
  }
  // Filter by date range
  if (startDate || endDate) {
    commentWhere.created_at = {};
    if (startDate) commentWhere.created_at.gte = startDate;
    if (endDate) commentWhere.created_at.lte = endDate;
  }
  // Get total counts for pagination
  const [postCount, commentCount] = await Promise.all([
    MyGlobal.prisma.reddit_like_posts.count({ where: postWhere }),
    MyGlobal.prisma.reddit_like_comments.count({ where: commentWhere }),
  ]);
  // Execute search with proper sorting
  let postOrderBy: Prisma.reddit_like_postsOrderByWithRelationInput;
  let commentOrderBy: Prisma.reddit_like_commentsOrderByWithRelationInput;
  if (sort === "new") {
    postOrderBy = { created_at: "desc" };
    commentOrderBy = { created_at: "desc" };
  } else if (sort === "hot") {
    postOrderBy = { score: "desc" };
    commentOrderBy = { vote_score: "desc" };
  } else if (sort === "controversial") {
    postOrderBy = { score: "asc" };
    commentOrderBy = { vote_score: "asc" };
  } else {
    // relevance - default to score desc
    postOrderBy = { score: "desc" };
    commentOrderBy = { vote_score: "desc" };
  }
  const [posts, comments] = await Promise.all([
    MyGlobal.prisma.reddit_like_posts.findMany({
      where: postWhere,
      orderBy: postOrderBy,
      skip,
      take: limit,
      select: {
        id: true,
        title: true,
        content: true,
        type: true,
        url: true,
        image_url: true,
        score: true,
        created_at: true,
        author: { select: { id: true, username: true, display_name: true } },
        community: { select: { id: true, name: true, icon_url: true } },
      },
    }),
    MyGlobal.prisma.reddit_like_comments.findMany({
      where: commentWhere,
      orderBy: commentOrderBy,
      skip,
      take: limit,
      select: {
        id: true,
        content: true,
        vote_score: true,
        created_at: true,
        author: { select: { id: true, username: true, display_name: true } },
        post: {
          select: {
            id: true,
            title: true,
            community: { select: { id: true, name: true, icon_url: true } },
          },
        },
      },
    }),
  ]);
  // Transform posts to search results
  const postResults: IRedditLikeSearchResult.ISummary[] = posts.map((post) => ({
    type: "post" as const,
    id: post.id,
    title: post.title,
    content: post.content || "",
    url: post.url || undefined,
    image_url: post.image_url || undefined,
    score: post.score,
    created_at: toISOStringSafe(post.created_at),
    author: {
      id: post.author.id,
      username: post.author.username,
      display_name: post.author.display_name,
    },
    community: {
      id: post.community.id,
      name: post.community.name,
      icon_url: post.community.icon_url,
    },
  }));
  // Transform comments to search results
  const commentResults: IRedditLikeSearchResult.ISummary[] = comments.map(
    (comment) => ({
      type: "comment" as const,
      id: comment.id,
      content: comment.content,
      score: comment.vote_score,
      created_at: toISOStringSafe(comment.created_at),
      author: {
        id: comment.author.id,
        username: comment.author.username,
        display_name: comment.author.display_name,
      },
      post: {
        id: comment.post.id,
        title: comment.post.title,
        community: {
          id: comment.post.community.id,
          name: comment.post.community.name,
          icon_url: comment.post.community.icon_url,
        },
      },
    }),
  );
  // Combine results
  const allResults = [...postResults, ...commentResults];
  // Calculate total for pagination
  const total = allResults.length;
  const pages = Math.ceil(total / limit);
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages,
    },
    data: allResults,
  };
}
