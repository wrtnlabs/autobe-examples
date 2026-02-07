import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
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

export async function getRedditPlatformUserCommentsCommentIdThread(props: {
  user: UserPayload;
  commentId: string;
}): Promise<IRedditPlatformComment> {
  const comment = await MyGlobal.prisma.reddit_platform_comments.findUnique({
    where: { id: props.commentId },
    select: {
      id: true,
      author_id: true,
      post_id: true,
      parent_comment_id: true,
      content: true,
      vote_score: true,
      comment_count: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }
  // Fetch all child comments in the thread using recursive queries
  const childComments = await MyGlobal.prisma.reddit_platform_comments.findMany(
    {
      where: {
        id: props.commentId,
        OR: [
          { parentComment: { is: { id: props.commentId } } },
          { parentComment: { parentComment: { is: { id: props.commentId } } } },
          {
            parentComment: {
              parentComment: {
                parentComment: { is: { id: props.commentId } },
              },
            },
          },
        ],
      },
    },
  );
  return {
    id: comment.id,
    author_id: comment.author_id,
    post_id: comment.post_id,
    parent_comment_id: comment.parent_comment_id,
    content: comment.content,
    vote_score: comment.vote_score,
    comment_count: comment.comment_count,
    created_at: toISOStringSafe(comment.created_at),
    updated_at: toISOStringSafe(comment.updated_at),
    deleted_at: comment.deleted_at ? toISOStringSafe(comment.deleted_at) : null,
  };
}
