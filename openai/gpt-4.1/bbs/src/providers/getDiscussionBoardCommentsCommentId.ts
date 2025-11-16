import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentAttachment";

export async function getDiscussionBoardCommentsCommentId(props: {
  commentId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardComment> {
  const comment = await MyGlobal.prisma.discussion_board_comments.findUnique({
    where: { id: props.commentId },
    include: {
      article: {
        include: {
          authorUser: true,
          authorAdmin: true,
        },
      },
      user: true,
      admin: true,
      discussion_board_comment_attachments: true,
    },
  });

  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }

  const author =
    comment.discussion_board_user_id && comment.user
      ? {
          id: comment.user.id,
          email: comment.user.email,
          is_email_verified: comment.user.is_email_verified,
          is_active: comment.user.is_active,
          is_blocked: comment.user.is_blocked,
          created_at: toISOStringSafe(comment.user.created_at),
          updated_at: toISOStringSafe(comment.user.updated_at),
          deleted_at: comment.user.deleted_at
            ? toISOStringSafe(comment.user.deleted_at)
            : undefined,
        }
      : comment.discussion_board_admin_id && comment.admin
        ? {
            id: comment.admin.id,
            display_name: comment.admin.email,
          }
        : undefined;

  if (!author) {
    throw new HttpException("Comment author no longer exists", 500);
  }

  const articleAuthor =
    comment.article.author_user_id && comment.article.authorUser
      ? {
          id: comment.article.authorUser.id,
          email: comment.article.authorUser.email,
          is_email_verified: comment.article.authorUser.is_email_verified,
          is_active: comment.article.authorUser.is_active,
          is_blocked: comment.article.authorUser.is_blocked,
          created_at: toISOStringSafe(comment.article.authorUser.created_at),
          updated_at: toISOStringSafe(comment.article.authorUser.updated_at),
          deleted_at: comment.article.authorUser.deleted_at
            ? toISOStringSafe(comment.article.authorUser.deleted_at)
            : undefined,
        }
      : comment.article.author_admin_id && comment.article.authorAdmin
        ? {
            id: comment.article.authorAdmin.id,
            display_name: comment.article.authorAdmin.email,
          }
        : undefined;

  if (!articleAuthor) {
    throw new HttpException("Article author no longer exists", 500);
  }

  const articleSummary = {
    id: comment.article.id,
    title: comment.article.title,
    created_at: toISOStringSafe(comment.article.created_at),
    updated_at: toISOStringSafe(comment.article.updated_at),
    author: articleAuthor,
  };

  const attachments = (comment.discussion_board_comment_attachments || []).map(
    (att) => ({
      id: att.id,
      discussion_board_comment_id: att.discussion_board_comment_id,
      file_url: att.file_url,
      original_filename: att.original_filename,
      mime_type: att.mime_type,
      file_size_bytes: att.file_size_bytes,
      created_at: toISOStringSafe(att.created_at),
    }),
  );

  return {
    id: comment.id,
    article: articleSummary,
    author: author,
    body: comment.body,
    attachments: attachments,
    created_at: toISOStringSafe(comment.created_at),
    updated_at: toISOStringSafe(comment.updated_at),
    deleted_at: comment.deleted_at
      ? toISOStringSafe(comment.deleted_at)
      : undefined,
  };
}
