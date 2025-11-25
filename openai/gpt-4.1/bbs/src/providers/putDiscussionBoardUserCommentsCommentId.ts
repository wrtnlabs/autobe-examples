import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleComment";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putDiscussionBoardUserCommentsCommentId(props: {
  user: UserPayload;
  commentId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleComment.IUpdate;
}): Promise<IDiscussionBoardArticleComment> {
  // Step 1: Fetch the existing comment
  const existing = await MyGlobal.prisma.discussion_board_comments.findUnique({
    where: { id: props.commentId },
  });
  if (!existing) {
    throw new HttpException("Comment not found", 404);
  }

  // Step 2: Check author
  if (existing.discussion_board_user_id !== props.user.id) {
    throw new HttpException("You are not the author of this comment", 403);
  }

  // Step 3: Check soft delete
  if (existing.deleted_at !== null) {
    throw new HttpException("Cannot edit a deleted comment", 400);
  }

  // Step 4: Snapshot comment version (schema has no 'updated_at')
  await MyGlobal.prisma.discussion_board_comment_snapshots.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      discussion_board_comment_id: existing.id,
      body: existing.body,
      created_at: toISOStringSafe(new Date()),
      discussion_board_user_id: existing.discussion_board_user_id,
      discussion_board_article_id: existing.discussion_board_article_id,
    },
  });

  // Step 5: Update comment
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.discussion_board_comments.update({
    where: { id: props.commentId },
    data: {
      body: props.body.body,
      updated_at: now,
    },
  });

  // Step 6: Fetch author and article (for summary DTOs)
  const [user, article] = await Promise.all([
    MyGlobal.prisma.discussion_board_users.findUnique({
      where: { id: updated.discussion_board_user_id },
    }),
    MyGlobal.prisma.discussion_board_articles.findUnique({
      where: { id: updated.discussion_board_article_id },
    }),
  ]);

  return {
    id: updated.id,
    body: updated.body,
    author: user
      ? {
          id: user.id,
          email: user.email,
          created_at: toISOStringSafe(user.created_at),
          updated_at: toISOStringSafe(user.updated_at),
          deleted_at:
            user.deleted_at === null
              ? undefined
              : toISOStringSafe(user.deleted_at),
        }
      : undefined!,
    article: article
      ? {
          id: article.id,
          title: article.title,
          created_at: toISOStringSafe(article.created_at),
          updated_at: article.updated_at
            ? toISOStringSafe(article.updated_at)
            : undefined,
          user: user
            ? {
                id: user.id,
                email: user.email,
                created_at: toISOStringSafe(user.created_at),
                updated_at: toISOStringSafe(user.updated_at),
                deleted_at:
                  user.deleted_at === null
                    ? undefined
                    : toISOStringSafe(user.deleted_at),
              }
            : undefined!,
        }
      : undefined!,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null
        ? undefined
        : toISOStringSafe(updated.deleted_at),
  };
}
