import { ICommunityPlatformPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostComment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformUserPostsPostIdCommentsSorted(props: {
  user: UserPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostComment.IRequest;
}): Promise<IPageICommunityPlatformPostComment.ISummary> {
  // Validate that the post exists
  const post = await MyGlobal.prisma.community_platform_posts.findUnique({
    where: { id: props.postId },
    select: { id: true },
  });
  if (!post) {
    throw new HttpException("Post not found", 404);
  }
  // Since IRequest has no strategy or pagination parameters, use fixed values
  const page = 1;
  const limit = 20;
  const skip = (page - 1) * limit;
  // Default sorting strategy (best): order by created_at desc
  const orderBy: Prisma.community_platform_post_commentsOrderByWithRelationInput[] =
    [{ created_at: "desc" }];
  // Query comments filtering soft-deleted and by post_id
  const comments =
    await MyGlobal.prisma.community_platform_post_comments.findMany({
      where: {
        post_id: props.postId,
        deleted_at: null,
      },
      skip,
      take: limit,
      orderBy,
      select: {
        id: true,
        post_id: true,
        parent_comment_id: true,
        user_id: true,
        content_text: true,
        created_at: true,
        updated_at: true,
      },
    });
  // Count total non-deleted comments for pagination
  const total = await MyGlobal.prisma.community_platform_post_comments.count({
    where: {
      post_id: props.postId,
      deleted_at: null,
    },
  });
  // Map comments to API response format
  const data = comments.map((comment) => ({
    id: comment.id,
    post_id: comment.post_id,
    parent_id:
      comment.parent_comment_id === null
        ? undefined
        : comment.parent_comment_id,
    author_id: comment.user_id,
    content: comment.content_text,
    created_at: toISOStringSafe(comment.created_at),
    updated_at: toISOStringSafe(comment.updated_at),
  }));
  // Return paginated comment list
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: total > 0 ? Math.ceil(total / limit) : 0,
    },
    data,
  };
}
