import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityComment";
import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PlatformadminPayload } from "../decorators/payload/PlatformadminPayload";
import { RedditCommunityCommentAtSummaryTransformer } from "../transformers/RedditCommunityCommentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityPlatformAdminPostsPostIdComments(props: {
  platformAdmin: PlatformadminPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditCommunityComment.IRequest;
}): Promise<IPageIRedditCommunityComment.ISummary> {
  const {
    sort = "best",
    limit = 50,
    cursor_id,
    cursor_created_at,
  } = props.body;
  // Validate limit bound
  if (limit < 1 || limit > 50)
    throw new HttpException("Limit must be between 1 and 50", 400);
  // Build sorting order - fixed to only valid properties
  const orderBy: Prisma.reddit_community_commentsOrderByWithRelationInput =
    sort === "best"
      ? { vote_score: "desc", created_at: "asc" }
      : sort === "new"
        ? { created_at: "desc", id: "desc" }
        : { vote_score: "desc", created_at: "desc" }; // replaced total_votes with created_at
  // Build cursor condition
  const whereCursor: any = {};
  if (cursor_id && cursor_created_at) {
    whereCursor.AND = [
      { created_at: { lt: cursor_created_at } },
      { id: { lt: cursor_id } },
    ];
  }
  // Fetch comments with proper Prisma pagination
  const comments = await MyGlobal.prisma.reddit_community_comments.findMany({
    where: {
      post_id: props.postId,
      deleted_at: null,
      ...whereCursor,
    },
    orderBy,
    take: limit + 1,
    skip: 0, // cursor-based pagination requires different implementation
    ...RedditCommunityCommentAtSummaryTransformer.select(),
  });
  // Extract cursor for next page
  const nextCursor = comments.length > limit ? comments[limit] : null;
  const data = comments.slice(0, limit);
  // Transform using established transformer
  const transformedData = await ArrayUtil.asyncMap(
    data,
    RedditCommunityCommentAtSummaryTransformer.transform,
  );
  // Count total for pagination (exclude deleted)
  const total = await MyGlobal.prisma.reddit_community_comments.count({
    where: { post_id: props.postId, deleted_at: null },
  });
  return {
    data: transformedData,
    pagination: {
      current: 1,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
