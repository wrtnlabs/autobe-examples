import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformComment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformCommentAtSummaryTransformer } from "../transformers/CommunityPlatformCommentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformAdminPostsPostIdCommentsSorted(props: {
  admin: AdminPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformComment.IRequest;
}): Promise<IPageICommunityPlatformComment.ISummary> {
  // Verify post exists
  await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow({
    where: { id: props.postId },
  });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build base query
  const whereInput = {
    community_platform_post_id: props.postId,
    is_deleted: false,
    ...(props.body.parent_comment_id && {
      parent_comment_id: props.body.parent_comment_id,
    }),
  } satisfies Prisma.community_platform_commentsWhereInput;
  // Get total count first
  const total = await MyGlobal.prisma.community_platform_comments.count({
    where: whereInput,
  });
  // Apply sorting with proper joins
  let orderByInput;
  let includeVoteScore = false;
  switch (props.body.sort) {
    case "best":
      // Best sort - join with vote scores and sort by score
      orderByInput = {
        voteScore: {
          score: "desc" as const,
        },
      } satisfies Prisma.community_platform_commentsOrderByWithRelationInput;
      includeVoteScore = true;
      break;
    case "controversial":
      // Controversial sort - high engagement with scores near zero
      orderByInput = {
        voteScore: {
          upvote_count: "desc" as const,
        },
      } satisfies Prisma.community_platform_commentsOrderByWithRelationInput;
      includeVoteScore = true;
      break;
    case "new":
    default:
      // New sort - chronological
      orderByInput = {
        created_at: "desc" as const,
      } satisfies Prisma.community_platform_commentsOrderByWithRelationInput;
      break;
  }
  // Get paginated comments with proper select
  const selectConfig = {
    ...CommunityPlatformCommentAtSummaryTransformer.select().select,
    ...(includeVoteScore && {
      voteScore: {
        select: {
          score: true,
          upvote_count: true,
          downvote_count: true,
        },
      } satisfies Prisma.community_platform_comment_vote_scoresFindManyArgs,
    }),
  };
  const comments = await MyGlobal.prisma.community_platform_comments.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    select: selectConfig,
  });
  // Transform comments with vote score
  const data = await Promise.all(
    comments.map(async (comment) => {
      const transformed =
        await CommunityPlatformCommentAtSummaryTransformer.transform(comment);
      // Update vote_score if voteScore data is available
      if (comment.voteScore) {
        return {
          ...transformed,
          vote_score: comment.voteScore.score,
        } satisfies ICommunityPlatformComment.ISummary;
      }
      return transformed;
    }),
  );
  return {
    data,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
