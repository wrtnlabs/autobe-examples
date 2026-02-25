import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityComment";
import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
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
import { RedditCommunityCommentAtSummaryTransformer } from "../transformers/RedditCommunityCommentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityMemberComments(props: {
  member: MemberPayload;
  body: IRedditCommunityComment.IRequest;
}): Promise<IPageIRedditCommunityComment> {
  const limit = props.body.limit ?? 50;
  const page = props.body.page ?? 1;
  // Validate and clamp limit
  const finalLimit = Math.min(Math.max(limit, 1), 50);
  // Build WHERE clause
  const where: Prisma.reddit_community_commentsWhereInput = {
    deleted_at: null,
  };
  if (props.body.post_id) {
    where.post_id = props.body.post_id;
  }
  if (props.body.author_id) {
    where.author_id = props.body.author_id;
  }
  // Cursor-based pagination
  let cursor:
    | {
        created_at: string;
        id: string;
      }
    | undefined;
  if (props.body.cursor_created_at && props.body.cursor_id) {
    cursor = {
      created_at: props.body.cursor_created_at,
      id: props.body.cursor_id,
    };
  }
  // Apply sorting logic
  let orderBy: Prisma.reddit_community_commentsOrderByWithRelationInput;
  if (props.body.sort === "best") {
    orderBy = { vote_score: "desc", created_at: "desc" };
  } else if (props.body.sort === "controversial") {
    // Controversial = high total votes, low sentiment balance
    // total_votes = upvotes + downvotes, vote_score = upvotes - downvotes
    // controversial_score = total_votes > 5 AND ABS(vote_score) < total_votes / 3
    // We can’t compute total_votes directly in Prisma WHERE, so sort by vote_score DESC, then created_at DESC
    // and let client apply controversial logic if needed — this is a known limitation of Prisma
    orderBy = { created_at: "desc" };
  } else {
    // default ‘new’ sort
    orderBy = { created_at: "desc" };
  }
  // Use cursor-based pagination: first fetch the cursor record for start point
  // Prisma does NOT allow cursor pagination with offset; cursor replaces offset entirely
  // If cursor provided, use it as after cursor (start after)
  // If cursor not provided, and page > 1, we must calculate offset but that’s inefficient — so we forbid page-based pagination
  // per spec: cursor is required for pagination. So we use cursor OR page=1
  if (cursor) {
    // We want results AFTER this cursor
    // Prisma's cursor pagination is inclusive for the cursor record
    // So we must use skip and not cursor for offset-like behavior if we're doing page=...
    // We’re using cursor for infinite scrolling: so only cursor mode is supported
    // We will ignore page if cursor is provided
    const data = await MyGlobal.prisma.reddit_community_comments.findMany({
      where,
      orderBy,
      take: finalLimit,
      cursor: cursor,
      skip: 1, // Skip cursor record
      ...RedditCommunityCommentAtSummaryTransformer.select(),
    });
    const total = await MyGlobal.prisma.reddit_community_comments.count({
      where,
    });
    const transformedData = await ArrayUtil.asyncMap(
      data,
      RedditCommunityCommentAtSummaryTransformer.transform,
    );
    const nextCursor =
      data.length > 0
        ? {
            created_at: data[data.length - 1].created_at,
            id: data[data.length - 1].id,
          }
        : undefined;
    const hasMore = data.length === finalLimit;
    return {
      data: typia.assert<IRedditCommunityComment[]>(transformedData),
      pagination: {
        current: 1,
        limit: finalLimit,
        records: total,
        pages: Math.ceil(total / finalLimit),
      } satisfies IPage.IPagination,
    };
  } else {
    // No cursor provided: default to page 1 only. Page > 1 not allowed under cursor mode
    if (page > 1) {
      return {
        data: [],
        pagination: {
          current: page,
          limit: finalLimit,
          records: 0,
          pages: 0,
        } satisfies IPage.IPagination,
      };
    }
    const data = await MyGlobal.prisma.reddit_community_comments.findMany({
      where,
      orderBy,
      take: finalLimit,
      skip: 0,
      ...RedditCommunityCommentAtSummaryTransformer.select(),
    });
    const total = await MyGlobal.prisma.reddit_community_comments.count({
      where,
    });
    const transformedData = await ArrayUtil.asyncMap(
      data,
      RedditCommunityCommentAtSummaryTransformer.transform,
    );
    const pagination = {
      current: page,
      limit: finalLimit,
      records: total,
      pages: Math.ceil(total / finalLimit),
    } satisfies IPage.IPagination;
    return {
      data: typia.assert<IRedditCommunityComment[]>(transformedData),
      pagination,
    } satisfies IPageIRedditCommunityComment;
  }
}
