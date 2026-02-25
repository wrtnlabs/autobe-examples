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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityCommentAtSummaryTransformer } from "../transformers/RedditCommunityCommentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityMemberPostsPostIdComments(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditCommunityComment.IRequest;
}): Promise<IPageIRedditCommunityComment.ISummary> {
  const {
    sort = "best",
    limit = 50,
    cursor_created_at,
    cursor_id,
  } = props.body;
  // Validate limit bounds
  if (limit < 1 || limit > 50)
    throw new HttpException("Limit must be between 1 and 50", 400);
  // Verify the post exists to prevent empty results
  const postExists = await MyGlobal.prisma.reddit_community_posts.findUnique({
    where: { id: props.postId },
    select: { id: true },
  });
  if (!postExists) throw new HttpException("Post not found", 404);
  // Get transformer select structure — must match transform()
  const { select } = RedditCommunityCommentAtSummaryTransformer;
  const selectFields = select();
  // Build where condition
  const where = {
    post_id: props.postId,
    deleted_at: null,
  };
  // Define sorting criteria — using only fields existing in schema
  const orderBy: Prisma.reddit_community_commentsOrderByWithRelationInput =
    sort === "best"
      ? { vote_score: "desc", created_at: "asc", id: "asc" }
      : sort === "new"
        ? { created_at: "desc", id: "desc" }
        : { vote_score: "desc", created_at: "desc", id: "desc" }; // 'controversial' fallback
  // Build cursor condition — cursor must be string & Format<'date-time'>
  // We compare string ISO format directly — no Date objects
  const cursorCondition =
    cursor_created_at && cursor_id
      ? {
          OR: [
            { created_at: { lt: cursor_created_at } },
            {
              created_at: cursor_created_at,
              id: { lt: cursor_id },
            },
          ],
        }
      : {};
  // Fetch paginated results
  const data = await MyGlobal.prisma.reddit_community_comments.findMany({
    where: {
      ...where,
      ...cursorCondition,
    },
    orderBy,
    take: limit + 1, // get one extra to determine if more exists
    ...selectFields,
  });
  // Determine if there's a next page
  const hasMore = data.length > limit;
  if (hasMore) data.pop(); // remove the extra item
  // Transform data to ISummary — must use transformer
  const transformedData = await ArrayUtil.asyncMap(
    data,
    RedditCommunityCommentAtSummaryTransformer.transform,
  );
  // Calculate total count
  const total = await MyGlobal.prisma.reddit_community_comments.count({
    where,
  });
  // Return page result — cursor-based pagination
  return {
    data: transformedData,
    pagination: {
      current: 1, // cursor-based — not page-based
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
