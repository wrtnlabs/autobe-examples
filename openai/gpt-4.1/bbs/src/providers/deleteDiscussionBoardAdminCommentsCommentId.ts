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

export async function deleteDiscussionBoardAdminCommentsCommentId(props: {
  admin: AdminPayload;
  commentId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardComment> {
  // 1. Fetch the comment, article, author, and attachments in parallel
  const comment = await MyGlobal.prisma.discussion_board_comments.findUnique({
    where: { id: props.commentId },
  });
  if (!comment) throw new HttpException("Comment not found", 404);
  if (comment.deleted_at)
    throw new HttpException("Comment is already deleted.", 400);

  // 2. Soft delete (set deleted_at) and update updated_at
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.discussion_board_comments.update({
    where: { id: props.commentId },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });

  // 3. Fetch (refresh) updated comment, article, author, and attachments
  const [updated, article, attachments] = await Promise.all([
    MyGlobal.prisma.discussion_board_comments.findUnique({
      where: { id: props.commentId },
    }),
    MyGlobal.prisma.discussion_board_articles.findUnique({
      where: { id: comment.discussion_board_article_id },
    }),
    MyGlobal.prisma.discussion_board_comment_attachments.findMany({
      where: { discussion_board_comment_id: props.commentId },
      orderBy: { created_at: "asc" },
    }),
  ]);
  if (!updated) throw new HttpException("Comment not found after update", 500);
  if (!article) throw new HttpException("Parent article not found", 500);

  // 4. Determine author (user or admin)
  let author: IDiscussionBoardUser.ISummary | IDiscussionBoardAdmin.ISummary;
  if (updated.discussion_board_user_id) {
    const user = await MyGlobal.prisma.discussion_board_users.findUnique({
      where: { id: updated.discussion_board_user_id },
    });
    if (!user) throw new HttpException("Comment user author not found", 500);
    author = {
      id: user.id,
      email: user.email,
      is_email_verified: user.is_email_verified,
      is_active: user.is_active,
      is_blocked: user.is_blocked,
      created_at: toISOStringSafe(user.created_at),
      updated_at: toISOStringSafe(user.updated_at),
      deleted_at: user.deleted_at
        ? toISOStringSafe(user.deleted_at)
        : undefined,
    };
  } else if (updated.discussion_board_admin_id) {
    const admin = await MyGlobal.prisma.discussion_board_admins.findUnique({
      where: { id: updated.discussion_board_admin_id },
    });
    if (!admin) throw new HttpException("Comment admin author not found", 500);
    author = {
      id: admin.id,
      display_name: admin.email, // Use email as fallback display_name
    };
  } else {
    throw new HttpException("Comment author not found", 500);
  }

  // 5. Build attachments list (using summary DTO)
  const attachmentSummaries = attachments.map((att) => ({
    id: att.id,
    discussion_board_comment_id: att.discussion_board_comment_id,
    file_url: att.file_url,
    original_filename: att.original_filename,
    mime_type: att.mime_type,
    file_size_bytes: att.file_size_bytes,
    created_at: toISOStringSafe(att.created_at),
  }));

  // 6. Build article summary
  let articleAuthor:
    | IDiscussionBoardUser.ISummary
    | IDiscussionBoardAdmin.ISummary;
  if (article.author_user_id) {
    const authorUser = await MyGlobal.prisma.discussion_board_users.findUnique({
      where: { id: article.author_user_id },
    });
    if (!authorUser)
      throw new HttpException("Article author user not found", 500);
    articleAuthor = {
      id: authorUser.id,
      email: authorUser.email,
      is_email_verified: authorUser.is_email_verified,
      is_active: authorUser.is_active,
      is_blocked: authorUser.is_blocked,
      created_at: toISOStringSafe(authorUser.created_at),
      updated_at: toISOStringSafe(authorUser.updated_at),
      deleted_at: authorUser.deleted_at
        ? toISOStringSafe(authorUser.deleted_at)
        : undefined,
    };
  } else if (article.author_admin_id) {
    const authorAdmin =
      await MyGlobal.prisma.discussion_board_admins.findUnique({
        where: { id: article.author_admin_id },
      });
    if (!authorAdmin)
      throw new HttpException("Article author admin not found", 500);
    articleAuthor = {
      id: authorAdmin.id,
      display_name: authorAdmin.email,
    };
  } else {
    throw new HttpException("Article author missing", 500);
  }

  // 7. Return full comment response object
  return {
    id: updated.id,
    article: {
      id: article.id,
      title: article.title,
      created_at: toISOStringSafe(article.created_at),
      updated_at: toISOStringSafe(article.updated_at),
      author: articleAuthor,
    },
    author,
    body: updated.body,
    attachments: attachmentSummaries,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
