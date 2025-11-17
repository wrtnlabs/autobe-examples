import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityForumPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumPostComment";

export async function getCommunityForumCommentsCommentId(props: {
  commentId: string & tags.Format<"uuid">;
}): Promise<ICommunityForumPostComment> {
  const comment = await MyGlobal.prisma.community_forum_comments.findUnique({
    where: {
      id: props.commentId,
    },
  });

  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }

  if (comment.deleted_at !== null) {
    throw new HttpException("Comment not found", 404);
  }

  return {
    id: comment.id,
    body: comment.body,
    created_at: toISOStringSafe(comment.created_at),
    updated_at: comment.updated_at
      ? toISOStringSafe(comment.updated_at)
      : undefined,
    deleted_at: comment.deleted_at ? toISOStringSafe(comment.deleted_at) : null,
    community_forum_post_id: comment.community_forum_post_id,
    community_forum_user_id: comment.community_forum_user_id,
    parent_id: comment.parent_id ?? undefined,
  };
}
