import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function getCommunityPlatformUserPostsPostIdCommentsCommentId(props: {
  user: UserPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformComment> {
  const comment = await MyGlobal.prisma.community_platform_comments.findFirst({
    where: { id: props.commentId, post_id: props.postId },
    select: {
      id: true,
      user_id: true,
      post_id: true,
      parent_id: true,
      content: true,
      is_deleted: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  if (comment === null) {
    throw new HttpException("Comment not found", 404);
  }
  return {
    id: comment.id,
    user_id: comment.user_id,
    post_id: comment.post_id,
    parent_id: comment.parent_id === null ? null : comment.parent_id,
    content: comment.content,
    is_deleted: comment.is_deleted,
    created_at: toISOStringSafe(comment.created_at),
    updated_at: toISOStringSafe(comment.updated_at),
    deleted_at:
      comment.deleted_at === null ? null : toISOStringSafe(comment.deleted_at),
  };
}
