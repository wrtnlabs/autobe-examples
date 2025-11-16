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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putDiscussionBoardAdminCommentsCommentId(props: {
  admin: AdminPayload;
  commentId: string & tags.Format<"uuid">;
  body: IDiscussionBoardComment.IUpdate;
}): Promise<IDiscussionBoardComment> {
  const comment = await MyGlobal.prisma.discussion_board_comments.findUnique({
    where: { id: props.commentId },
    include: {
      article: {
        include: { authorUser: true, authorAdmin: true },
      },
      user: true,
      admin: true,
      discussion_board_comment_attachments: true,
    },
  });
  if (!comment || comment.deleted_at !== null) {
    throw new HttpException("Comment not found or has been deleted.", 404);
  }
  const nextBody = props.body.body ?? comment.body;
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.discussion_board_comments.update({
    where: { id: props.commentId },
    data: { body: nextBody, updated_at: now },
    include: {
      article: {
        include: { authorUser: true, authorAdmin: true },
      },
      user: true,
      admin: true,
      discussion_board_comment_attachments: true,
    },
  });
  let author: IDiscussionBoardUser.ISummary | IDiscussionBoardAdmin.ISummary;
  if (
    updated.admin &&
    typeof (updated.admin as any).display_name === "string" &&
    (updated.admin as any).display_name
  ) {
    author = {
      id: updated.admin.id,
      display_name: (updated.admin as any).display_name as string,
    };
  } else if (updated.user) {
    author = {
      id: updated.user.id,
      email: updated.user.email,
      is_email_verified: updated.user.is_email_verified,
      is_active: updated.user.is_active,
      is_blocked: updated.user.is_blocked,
      created_at: toISOStringSafe(updated.user.created_at),
      updated_at: toISOStringSafe(updated.user.updated_at),
      deleted_at:
        updated.user.deleted_at !== null
          ? toISOStringSafe(updated.user.deleted_at)
          : undefined,
    };
  } else {
    throw new HttpException("Comment author does not exist.", 500);
  }
  const article = updated.article;
  let articleAuthor:
    | IDiscussionBoardUser.ISummary
    | IDiscussionBoardAdmin.ISummary
    | null = null;
  if (
    article.authorAdmin &&
    typeof (article.authorAdmin as any).display_name === "string" &&
    (article.authorAdmin as any).display_name
  ) {
    articleAuthor = {
      id: article.authorAdmin.id,
      display_name: (article.authorAdmin as any).display_name as string,
    };
  } else if (article.authorUser) {
    articleAuthor = {
      id: article.authorUser.id,
      email: article.authorUser.email,
      is_email_verified: article.authorUser.is_email_verified,
      is_active: article.authorUser.is_active,
      is_blocked: article.authorUser.is_blocked,
      created_at: toISOStringSafe(article.authorUser.created_at),
      updated_at: toISOStringSafe(article.authorUser.updated_at),
      deleted_at:
        article.authorUser.deleted_at !== null
          ? toISOStringSafe(article.authorUser.deleted_at)
          : undefined,
    };
  }
  if (!articleAuthor) {
    throw new HttpException("Article author does not exist.", 500);
  }
  const articleSummary: IDiscussionBoardArticle.ISummary = {
    id: article.id,
    title: article.title,
    created_at: toISOStringSafe(article.created_at),
    updated_at: toISOStringSafe(article.updated_at),
    author: articleAuthor,
  };
  const attachments = updated.discussion_board_comment_attachments.map((a) => ({
    id: a.id,
    discussion_board_comment_id: a.discussion_board_comment_id,
    file_url: a.file_url,
    original_filename: a.original_filename,
    mime_type: a.mime_type,
    file_size_bytes: a.file_size_bytes,
    created_at: toISOStringSafe(a.created_at),
  }));
  return {
    id: updated.id,
    article: articleSummary,
    author,
    body: updated.body,
    attachments,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== null
        ? toISOStringSafe(updated.deleted_at)
        : undefined,
  };
}
