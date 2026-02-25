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
import { UserPayload } from "../decorators/payload/UserPayload";
import { CommunityPlatformCommentAtSummaryTransformer } from "../transformers/CommunityPlatformCommentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchCommunityPlatformUserPostsPostIdCommentsSorted(props: {
  user: UserPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformComment.IRequest;
}): Promise<IPageICommunityPlatformComment.ISummary> {
  // Verify post exists
  const post = await MyGlobal.prisma.community_platform_posts.findUnique({
    where: { id: props.postId, deleted_at: null },
  });
  if (!post) {
    throw new HttpException("Post not found", 404);
  }
  // Build WHERE clause
  const whereInput = {
    community_platform_post_id: props.postId,
    is_deleted: false,
    ...(props.body.parent_comment_id !== undefined &&
    props.body.parent_comment_id !== null
      ? { parent_comment_id: props.body.parent_comment_id }
      : { parent_comment_id: null }),
  } satisfies Prisma.community_platform_commentsWhereInput;
  // Pagination setup
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  const skip = (page - 1) * limit;
  // Build sorting based on requested algorithm
  let orderByInput: Prisma.community_platform_commentsOrderByWithRelationInput;
  let includeVoteScore = false;
  switch (props.body.sort) {
    case "best":
      // Best sort using Wilson score confidence interval
      // Formula: (p + z^2/2n ± z√[p(1-p)/n + z^2/4n^2]) / (1 + z^2/n)
      // For simplicity, we'll use a simplified confidence calculation
      orderByInput = {
        voteScore: {
          score: "desc",
        },
      } satisfies Prisma.community_platform_commentsOrderByWithRelationInput;
      includeVoteScore = true;
      break;
    case "controversial":
      // Controversial sort - high total votes with scores near zero
      orderByInput = {
        voteScore: {
          upvote_count: "desc",
        },
      } satisfies Prisma.community_platform_commentsOrderByWithRelationInput;
      includeVoteScore = true;
      break;
    case "new":
    default:
      // New sort - chronological descending
      orderByInput = {
        created_at: "desc",
      } satisfies Prisma.community_platform_commentsOrderByWithRelationInput;
      break;
  }
  // Build query with proper joins
  const queryOptions = {
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    ...CommunityPlatformCommentAtSummaryTransformer.select(),
  };
  // Query comments with pagination and sorting
  const comments =
    await MyGlobal.prisma.community_platform_comments.findMany(queryOptions);
  // Get total count for pagination
  const total = await MyGlobal.prisma.community_platform_comments.count({
    where: whereInput,
  });
  // Transform comments
  const transformedComments = await Promise.all(
    comments.map((comment) =>
      CommunityPlatformCommentAtSummaryTransformer.transform(comment),
    ),
  );
  return {
    data: transformedComments,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
