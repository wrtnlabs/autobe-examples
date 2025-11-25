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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putDiscussionBoardAdminCommentsCommentId(props: {
  admin: AdminPayload;
  commentId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleComment.IUpdate;
}): Promise<IDiscussionBoardArticleComment> {
  // 1. Fetch the comment & associated user and article
  const comment = await MyGlobal.prisma.discussion_board_comments.findUnique({
    where: { id: props.commentId },
    include: {
      user: true,
      article: {
        include: { user: true },
      },
    },
  });
  if (!comment) throw new HttpException("Comment not found", 404);
  if (comment.deleted_at !== null)
    throw new HttpException("Cannot update a deleted comment", 400);

  // 2. Record a snapshot before editing (all schema-required fields)
  await MyGlobal.prisma.discussion_board_comment_snapshots.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      discussion_board_comment_id: comment.id,
      discussion_board_article_id: comment.article.id,
      discussion_board_user_id: comment.user.id,
      body: comment.body,
      created_at: toISOStringSafe(new Date()),
    },
  });

  // 3. Perform the update
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.discussion_board_comments.update({
    where: { id: props.commentId },
    data: {
      body: props.body.body,
      updated_at: now,
    },
    include: {
      user: true,
      article: { include: { user: true } },
    },
  });

  // 4. Build DTOs for nested user and article summaries
  const authorSummary: IDiscussionBoardUser.ISummary = {
    id: updated.user.id,
    email: updated.user.email,
    created_at: toISOStringSafe(updated.user.created_at),
    updated_at: toISOStringSafe(updated.user.updated_at),
    deleted_at:
      updated.user.deleted_at === null
        ? undefined
        : toISOStringSafe(updated.user.deleted_at),
  };
  const articleSummary: IDiscussionBoardArticle.ISummary = {
    id: updated.article.id,
    title: updated.article.title,
    user: {
      id: updated.article.user.id,
      email: updated.article.user.email,
      created_at: toISOStringSafe(updated.article.user.created_at),
      updated_at: toISOStringSafe(updated.article.user.updated_at),
      deleted_at:
        updated.article.user.deleted_at === null
          ? undefined
          : toISOStringSafe(updated.article.user.deleted_at),
    },
    created_at: toISOStringSafe(updated.article.created_at),
    updated_at: updated.article.updated_at
      ? toISOStringSafe(updated.article.updated_at)
      : undefined,
  };

  return {
    id: updated.id,
    author: authorSummary,
    article: articleSummary,
    body: updated.body,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null
        ? undefined
        : toISOStringSafe(updated.deleted_at),
  };
}
