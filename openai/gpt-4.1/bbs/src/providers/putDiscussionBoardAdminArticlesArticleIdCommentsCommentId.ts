import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleComment";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putDiscussionBoardAdminArticlesArticleIdCommentsCommentId(props: {
  admin: AdminPayload;
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleComment.IUpdate;
}): Promise<IDiscussionBoardArticleComment> {
  // 1. Check admin is allowed (provider/decorator enforces valid/active admin already)
  // 2. Fetch comment by commentId, articleId, with deleted_at: null on both
  const comment =
    await MyGlobal.prisma.discussion_board_article_comments.findFirst({
      where: {
        id: props.commentId,
        discussion_board_article_id: props.articleId,
        deleted_at: null,
      },
      include: {
        article: {
          select: { id: true, deleted_at: true },
        },
        authorUser: {
          select: { id: true, display_name: true, avatar_url: true },
        },
      },
    });
  if (!comment || comment.article.deleted_at !== null) {
    throw new HttpException(
      "Comment or parent article not found or deleted.",
      404,
    );
  }

  // 3. Only update if body is present in request
  if (props.body.body === undefined) {
    throw new HttpException("No update content provided.", 400);
  }

  // 4. Update body and updated_at
  const now = toISOStringSafe(new Date());
  const updated =
    await MyGlobal.prisma.discussion_board_article_comments.update({
      where: { id: props.commentId },
      data: {
        body: props.body.body,
        updated_at: now,
      },
      include: {
        authorUser: {
          select: { id: true, display_name: true, avatar_url: true },
        },
      },
    });

  // 5. Return result, mapping types strictly
  return {
    id: updated.id,
    discussion_board_article_id: updated.discussion_board_article_id,
    author: {
      id: updated.authorUser.id,
      display_name: updated.authorUser.display_name,
      avatar_url: updated.authorUser.avatar_url ?? undefined,
    },
    body: updated.body,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null
        ? undefined
        : toISOStringSafe(updated.deleted_at),
  };
}
