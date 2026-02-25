import { ICommunityPlatformCommentVoteScore } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVoteScore";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformCommentVoteScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommentVoteScore";
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

export async function patchCommunityPlatformAdminCommentsVoteScores(props: {
  admin: AdminPayload;
  body: ICommunityPlatformCommentVoteScore.IRequest;
}): Promise<IPageICommunityPlatformCommentVoteScore.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE clause for comment_vote_scores with proper date handling
  const whereInput: Prisma.community_platform_comment_vote_scoresWhereInput = {
    AND: [
      ...(props.body.minimum_score !== undefined
        ? [{ score: { gte: props.body.minimum_score } }]
        : []),
      ...(props.body.maximum_score !== undefined
        ? [{ score: { lte: props.body.maximum_score } }]
        : []),
      ...(props.body.minimum_upvotes !== undefined
        ? [{ upvote_count: { gte: props.body.minimum_upvotes } }]
        : []),
      ...(props.body.minimum_downvotes !== undefined
        ? [{ downvote_count: { gte: props.body.minimum_downvotes } }]
        : []),
      ...(props.body.created_after !== undefined
        ? [{ created_at: { gte: props.body.created_after } }]
        : []),
      ...(props.body.created_before !== undefined
        ? [{ created_at: { lte: props.body.created_before } }]
        : []),
      ...(props.body.updated_after !== undefined
        ? [{ last_updated_at: { gte: props.body.updated_after } }]
        : []),
      ...(props.body.updated_before !== undefined
        ? [{ last_updated_at: { lte: props.body.updated_before } }]
        : []),
    ].filter(Boolean),
  };
  // Handle comment content filtering with proper JOIN
  if (props.body.comment_content) {
    whereInput.comment = {
      content: { contains: props.body.comment_content, mode: "insensitive" },
    } satisfies Prisma.community_platform_commentsWhereInput;
  }
  // Build ORDER BY clause
  const orderByInput: Prisma.community_platform_comment_vote_scoresOrderByWithRelationInput =
    props.body.sort_by
      ? props.body.sort_by === "score"
        ? { score: props.body.sort_order === "desc" ? "desc" : "asc" }
        : props.body.sort_by === "upvote_count"
          ? { upvote_count: props.body.sort_order === "desc" ? "desc" : "asc" }
          : {
              last_updated_at:
                props.body.sort_order === "desc" ? "desc" : "asc",
            }
      : { last_updated_at: "desc" };
  try {
    // Execute queries sequentially for better error handling
    const data =
      await MyGlobal.prisma.community_platform_comment_vote_scores.findMany({
        where: whereInput,
        skip,
        take: limit,
        orderBy: orderByInput,
      });
    const total =
      await MyGlobal.prisma.community_platform_comment_vote_scores.count({
        where: whereInput,
      });
    // Transform results with proper type handling
    const transformedData: ICommunityPlatformCommentVoteScore.ISummary[] =
      data.map((score) => ({
        id: score.id,
        upvote_count: score.upvote_count,
        downvote_count: score.downvote_count,
        score: score.score,
        last_updated_at: score.last_updated_at.toISOString(),
        comment_id: score.community_platform_comment_id,
      }));
    return {
      pagination: {
        current: page,
        limit: limit,
        records: total,
        pages: Math.ceil(total / limit),
      } satisfies IPage.IPagination,
      data: transformedData,
    };
  } catch (error) {
    throw new HttpException("Failed to retrieve comment vote scores", 500);
  }
}
