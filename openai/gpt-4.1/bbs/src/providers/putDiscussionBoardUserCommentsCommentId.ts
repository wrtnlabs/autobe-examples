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
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putDiscussionBoardUserCommentsCommentId(props: {
  user: UserPayload;
  commentId: string & tags.Format<"uuid">;
  body: IDiscussionBoardComment.IUpdate;
}): Promise<IDiscussionBoardComment> {
  const comment = await MyGlobal.prisma.discussion_board_comments.findUnique({
    where: { id: props.commentId },
    include: {
      article: true,
      user: true,
      admin: true,
    },
  });

  if (
    !comment ||
    (comment.deleted_at !== null && comment.deleted_at !== undefined)
  ) {
    throw new HttpException("Comment not found or already deleted.", 404);
  }

  if (
    comment.discussion_board_user_id !== props.user.id ||
    comment.discussion_board_admin_id !== null
  ) {
    throw new HttpException(
      "You do not have permission to update this comment.",
      403,
    );
  }

  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.discussion_board_comments.update({
    where: { id: props.commentId },
    data: {
      body: props.body.body ?? comment.body,
      updated_at: now,
    },
    include: {
      article: true,
      user: true,
      admin: true,
    },
  });

  const attachments =
    await MyGlobal.prisma.discussion_board_comment_attachments.findMany({
      where: { discussion_board_comment_id: props.commentId },
      orderBy: { created_at: "asc" },
    });

  let author: IDiscussionBoardUser.ISummary | IDiscussionBoardAdmin.ISummary;
  if (updated.user) {
    author = {
      id: updated.user.id,
      email: updated.user.email,
      is_email_verified: updated.user.is_email_verified,
      is_active: updated.user.is_active,
      is_blocked: updated.user.is_blocked,
      created_at: toISOStringSafe(updated.user.created_at),
      updated_at: toISOStringSafe(updated.user.updated_at),
      deleted_at:
        updated.user.deleted_at !== null &&
        updated.user.deleted_at !== undefined
          ? toISOStringSafe(updated.user.deleted_at)
          : undefined,
    };
  } else if (updated.admin) {
    author = {
      id: updated.admin.id,
      display_name: updated.admin.email,
    };
  } else {
    throw new HttpException("Author not found.", 500);
  }

  let articleAuthor:
    | IDiscussionBoardUser.ISummary
    | IDiscussionBoardAdmin.ISummary;
  let articleSummary: IDiscussionBoardArticle.ISummary;
  if (!updated.article) {
    throw new HttpException("Article not found.", 500);
  }
  let articleUser: any = null;
  if (updated.article.author_user_id) {
    articleUser = await MyGlobal.prisma.discussion_board_users.findUnique({
      where: { id: updated.article.author_user_id },
    });
  }
  let articleAdmin: any = null;
  if (updated.article.author_admin_id) {
    articleAdmin = await MyGlobal.prisma.discussion_board_admins.findUnique({
      where: { id: updated.article.author_admin_id },
    });
  }

  if (articleUser) {
    articleAuthor = {
      id: articleUser.id,
      email: articleUser.email,
      is_email_verified: articleUser.is_email_verified,
      is_active: articleUser.is_active,
      is_blocked: articleUser.is_blocked,
      created_at: toISOStringSafe(articleUser.created_at),
      updated_at: toISOStringSafe(articleUser.updated_at),
      deleted_at:
        articleUser.deleted_at !== null && articleUser.deleted_at !== undefined
          ? toISOStringSafe(articleUser.deleted_at)
          : undefined,
    };
  } else if (articleAdmin) {
    articleAuthor = {
      id: articleAdmin.id,
      display_name: articleAdmin.email,
    };
  } else {
    throw new HttpException("Article author not found.", 500);
  }

  articleSummary = {
    id: updated.article.id,
    title: updated.article.title,
    created_at: toISOStringSafe(updated.article.created_at),
    updated_at: toISOStringSafe(updated.article.updated_at),
    author: articleAuthor,
  };

  const attachmentSummaries = attachments.map(
    (a: any): IDiscussionBoardCommentAttachment.ISummary => ({
      id: a.id,
      discussion_board_comment_id: a.discussion_board_comment_id,
      file_url: a.file_url,
      original_filename: a.original_filename,
      mime_type: a.mime_type,
      file_size_bytes: a.file_size_bytes,
      created_at: toISOStringSafe(a.created_at),
    }),
  );

  return {
    id: updated.id,
    article: articleSummary,
    author: author,
    body: updated.body,
    attachments: attachmentSummaries,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== null && updated.deleted_at !== undefined
        ? toISOStringSafe(updated.deleted_at)
        : undefined,
  };
}
