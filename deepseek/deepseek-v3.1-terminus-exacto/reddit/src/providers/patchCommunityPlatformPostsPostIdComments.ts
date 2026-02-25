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
import { CommunityPlatformCommentTransformer } from "../transformers/CommunityPlatformCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformPostsPostIdComments(props: {
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformComment.IRequest;
}): Promise<IPageICommunityPlatformComment> {
  // Validate that the post exists and is accessible
  await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow({
    where: { id: props.postId, deleted_at: null },
    select: { id: true },
  });
  // Extract pagination and filtering parameters
  const page = Math.max(1, props.body.page ?? 1);
  const limit = Math.min(100, Math.max(1, props.body.limit ?? 50));
  const skip = (page - 1) * limit;
  const parentCommentId = props.body.parent_comment_id;
  // Build WHERE clause using correct field names
  const whereClause: Prisma.community_platform_commentsWhereInput = {
    post: { id: props.postId },
    is_deleted: false,
    ...(parentCommentId !== undefined && {
      parent: parentCommentId === null ? null : { id: parentCommentId },
    }),
  };
  // Build ORDER BY clause with proper joins for sorting
  let orderBy: Prisma.community_platform_commentsOrderByWithRelationInput;
  switch (props.body.sort) {
    case "best":
      // Use vote score from comment_scores join
      orderBy = { commentScore: { total_score: "desc" as const } };
      break;
    case "controversial":
      // Use controversial score from comment_scores join
      orderBy = { commentScore: { controversial_score: "desc" as const } };
      break;
    case "new":
    default:
      // Sort by creation date
      orderBy = { created_at: "desc" as const };
      break;
  }
  // Fetch paginated comments with required relations
  const comments = await MyGlobal.prisma.community_platform_comments.findMany({
    where: whereClause,
    orderBy,
    skip,
    take: limit,
    ...CommunityPlatformCommentTransformer.select(),
  });
  // Get total count for pagination
  const total = await MyGlobal.prisma.community_platform_comments.count({
    where: whereClause,
  });
  // Transform comments using transformer
  const transformedData = await ArrayUtil.asyncMap(
    comments,
    CommunityPlatformCommentTransformer.transform,
  );
  // Return paginated response
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
