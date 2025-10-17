import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postRedditLikeAdminCommentsCommentIdRestore(props: {
  admin: AdminPayload;
  commentId: string & tags.Format<"uuid">;
}): Promise<IRedditLikeComment> {
  const { commentId } = props;

  // Verify comment exists and is currently soft-deleted
  const existingComment = await MyGlobal.prisma.reddit_like_comments.findFirst({
    where: {
      id: commentId,
      deleted_at: { not: null },
    },
  });

  if (!existingComment) {
    throw new HttpException("Comment not found or not in deleted state", 404);
  }

  // Restore comment by clearing deleted_at timestamp
  const restoredComment = await MyGlobal.prisma.reddit_like_comments.update({
    where: { id: commentId },
    data: {
      deleted_at: null,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: restoredComment.id as string & tags.Format<"uuid">,
    reddit_like_post_id: restoredComment.reddit_like_post_id as string &
      tags.Format<"uuid">,
    reddit_like_parent_comment_id:
      restoredComment.reddit_like_parent_comment_id === null
        ? undefined
        : (restoredComment.reddit_like_parent_comment_id as string &
            tags.Format<"uuid">),
    content_text: restoredComment.content_text,
    depth: restoredComment.depth,
    vote_score: restoredComment.vote_score,
    edited: restoredComment.edited,
    created_at: toISOStringSafe(restoredComment.created_at),
    updated_at: toISOStringSafe(restoredComment.updated_at),
  };
}
