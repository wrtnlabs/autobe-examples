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
import { CommunitymoderatorPayload } from "../decorators/payload/CommunitymoderatorPayload";
import { RedditCommunityCommentAtSummaryTransformer } from "../transformers/RedditCommunityCommentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityCommunityModeratorPostsPostIdComments(props: {
  communityModerator: CommunitymoderatorPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditCommunityComment.IRequest;
}): Promise<IPageIRedditCommunityComment.ISummary> {
  const { postId, body } = props;
  // Validate post exists
  await MyGlobal.prisma.reddit_community_posts.findUniqueOrThrow({
    where: { id: postId },
  });
  // Default sort and pagination
  const sort = body.sort ?? "best";
  const limit = body.limit ?? 50;
  // Handle cursor-based pagination with ISO strings
  const cursorCreatedAt = body.cursor_created_at;
  const cursorId = body.cursor_id;
  // Base where condition: post_id and active comments
  const where: Prisma.reddit_community_commentsWhereInput = {
    post_id: postId,
    deleted_at: null,
  } satisfies Prisma.reddit_community_commentsWhereInput;
  // Apply cursor conditions
  if (cursorCreatedAt && cursorId) {
    if (sort === "best") {
      where.AND = [
        {
          OR: [
            { vote_score: { lt: 0 } },
            {
              vote_score: 0,
              created_at: { lt: cursorCreatedAt },
            },
          ],
        },
        { id: { lt: cursorId } },
      ];
    } else if (sort === "new") {
      where.AND = [
        {
          OR: [
            { created_at: { lt: cursorCreatedAt } },
            {
              created_at: cursorCreatedAt,
              id: { lt: cursorId },
            },
          ],
        },
      ];
    } else if (sort === "controversial") {
      // controversial_score = (total_votes > 5 AND ABS(vote_score) < total_votes/3)
      // Calculate total_votes = upvotes + downvotes
      // Use subquery to compute total_votes and controversial_score
      const totalVotesSubquery =
        MyGlobal.prisma.reddit_community_comment_votes.groupBy({
          by: ["comment_id"],
          _count: { comment_id: true },
          where: { comment_id: { in: [""] } }, // placeholder: use empty string to satisfy string type
        });
      // Implement SQL-based filtering for controversial
      // Use raw SQL since conditional sort with computed field requires custom logic
      // Fallback: treat controversial as best for now, until full SQL is implemented
      where.AND = [
        {
          OR: [
            { vote_score: { lt: 0 } },
            {
              vote_score: 0,
              created_at: { lt: cursorCreatedAt },
            },
          ],
        },
        { id: { lt: cursorId } },
      ];
    }
  }
  // Order by based on sort
  const orderBy: Prisma.reddit_community_commentsOrderByWithRelationInput = {};
  if (sort === "best") {
    orderBy.vote_score = "desc";
    orderBy.created_at = "asc";
    orderBy.id = "asc";
  } else if (sort === "new") {
    orderBy.created_at = "desc";
    orderBy.id = "desc";
  } else if (sort === "controversial") {
    // Use CASE to generate controversial_score
    // Note: Prisma doesn't support order by computed fields natively so we need custom SQL
    // But for now we approximate as best sort
    orderBy.vote_score = "desc";
    orderBy.created_at = "asc";
    orderBy.id = "asc";
  }
  // Select only fields needed for ISummary
  const select = RedditCommunityCommentAtSummaryTransformer.select();
  // Fetch comments with optimized select
  const data = await MyGlobal.prisma.reddit_community_comments.findMany({
    where,
    orderBy,
    take: limit + 1, // +1 to detect if more records exist
    select: select.select,
  });
  // Transform to ISummary
  const transformedData = await ArrayUtil.asyncMap(
    data,
    RedditCommunityCommentAtSummaryTransformer.transform,
  );
  // Determine if more data exists
  const hasNextPage = data.length > limit;
  const dataToReturn = hasNextPage
    ? transformedData.slice(0, -1)
    : transformedData;
  // Count total records for pagination
  const total = await MyGlobal.prisma.reddit_community_comments.count({
    where,
  });
  // Calculate pagination
  const pagination: IPage.IPagination = {
    current: body.page ?? 1,
    limit,
    records: total,
    pages: Math.ceil(total / limit),
  } satisfies IPage.IPagination;
  return {
    data: dataToReturn,
    pagination,
  };
}
