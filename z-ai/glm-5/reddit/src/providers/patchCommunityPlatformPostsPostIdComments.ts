import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
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
import { CommunityPlatformCommentAtSummaryTransformer } from "../transformers/CommunityPlatformCommentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformPostsPostIdComments(props: {
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformComment.IRequest;
}): Promise<IPageICommunityPlatformComment.ISummary> {
  // Validate post exists and not deleted
  const post = await MyGlobal.prisma.community_platform_posts.findUnique({
    where: { id: props.postId },
    select: { id: true },
  });
  if (!post) {
    throw new HttpException("Post not found", 404);
  }
  // Build pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE clause - exclude deleted comments
  const whereInput = {
    post_id: props.postId,
    deleted_at: null,
    ...(props.body.authorId && { author_id: props.body.authorId }),
  } satisfies Prisma.community_platform_commentsWhereInput;
  // Build ORDER BY based on sort
  const sort = props.body.sort ?? "best";
  const orderByInput: Prisma.community_platform_commentsOrderByWithRelationInput[] =
    sort === "new"
      ? [{ created_at: "desc" }]
      : sort === "controversial"
        ? [{ score: "asc" }, { created_at: "desc" }]
        : [{ score: "desc" }, { created_at: "asc" }];
  // Query comments with transformer select
  const comments = await MyGlobal.prisma.community_platform_comments.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...CommunityPlatformCommentAtSummaryTransformer.select(),
  });
  // Count total matching comments
  const total = await MyGlobal.prisma.community_platform_comments.count({
    where: whereInput,
  });
  // Transform results using transformer
  const data = await ArrayUtil.asyncMap(
    comments,
    CommunityPlatformCommentAtSummaryTransformer.transform,
  );
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageICommunityPlatformComment.ISummary;
}
