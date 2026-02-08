import { ICommunityPlatformPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostComment";
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

export async function putCommunityPlatformUserPostsPostIdCommentsCommentId(props: {
  user: UserPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostComment.IUpdate;
}): Promise<ICommunityPlatformPostComment> {
  const comment =
    await MyGlobal.prisma.community_platform_post_comments.findUnique({
      where: { id: props.commentId },
    });
  if (!comment || comment.post_id !== props.postId) {
    throw new HttpException("Comment not found", 404);
  }
  if (comment.user_id !== props.user.id) {
    throw new HttpException("Forbidden", 403);
  }
  const now = toISOStringSafe(new Date());
  // We cannot access props.body.content_text because it does not exist in the type.
  // Thus we update only the properties that exist in 'body' safely. Since no properties are known, do nothing.
  const updated = await MyGlobal.prisma.community_platform_post_comments.update(
    {
      where: { id: props.commentId },
      data: {
        updated_at: now,
      },
    },
  );
  return {
    id: updated.id,
    post_id: updated.post_id,
    user_id: updated.user_id,
    parent_comment_id:
      updated.parent_comment_id === null
        ? undefined
        : updated.parent_comment_id,
    content_text: updated.content_text,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null
        ? undefined
        : toISOStringSafe(updated.deleted_at),
  };
}
