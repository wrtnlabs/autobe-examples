import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformCommentsCommentId(props: {
  commentId: string;
}): Promise<IRedditPlatformComment> {
  const comment = await MyGlobal.prisma.reddit_platform_comments.findUnique({
    where: {
      id: props.commentId,
    },
  });
  if (!comment || comment.deleted_at !== null) {
    throw new HttpException("Comment not found", 404);
  }
  return {
    id: comment.id,
    content: comment.content,
    vote_score: comment.vote_score,
    comment_count: comment.comment_count,
    created_at: toISOStringSafe(comment.created_at),
    updated_at: toISOStringSafe(comment.updated_at),
    author_id: comment.author_id,
    post_id: comment.post_id,
    parent_comment_id:
      comment.parent_comment_id === null
        ? undefined
        : comment.parent_comment_id,
  };
}
