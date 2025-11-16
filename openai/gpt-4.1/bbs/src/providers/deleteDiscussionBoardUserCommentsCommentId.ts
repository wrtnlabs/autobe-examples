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

export async function deleteDiscussionBoardUserCommentsCommentId(props: {
  user: UserPayload;
  commentId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardComment> {
  // Step 1: Find the comment (not soft-deleted)
  const comment = await MyGlobal.prisma.discussion_board_comments.findUnique({
    where: { id: props.commentId },
  });
  if (!comment || comment.deleted_at !== null) {
    throw new HttpException("Comment not found or already deleted", 404);
  }
  // Step 2: Only the comment owner can delete
  if (comment.discussion_board_user_id !== props.user.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: Soft delete (set deleted_at to now as string/date-time)
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.discussion_board_comments.update({
    where: { id: props.commentId },
    data: { deleted_at: now },
  });
  // Step 4: Fetch related entities for API response - article summary, author summary, and attachments
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: comment.discussion_board_article_id },
  });
  if (!article) throw new HttpException("Article not found", 404);
  // Author summary
  let author: IDiscussionBoardUser.ISummary | IDiscussionBoardAdmin.ISummary;
  if (comment.discussion_board_user_id !== null) {
    const u = await MyGlobal.prisma.discussion_board_users.findUnique({
      where: { id: comment.discussion_board_user_id },
    });
    if (!u) throw new HttpException("Author user not found", 500);
    author = {
      id: u.id,
      email: u.email,
      is_email_verified: u.is_email_verified,
      is_active: u.is_active,
      is_blocked: u.is_blocked,
      created_at: toISOStringSafe(u.created_at),
      updated_at: toISOStringSafe(u.updated_at),
      deleted_at: u.deleted_at ? toISOStringSafe(u.deleted_at) : undefined,
    };
  } else if (comment.discussion_board_admin_id !== null) {
    const a = await MyGlobal.prisma.discussion_board_admins.findUnique({
      where: { id: comment.discussion_board_admin_id },
    });
    if (!a) throw new HttpException("Author admin not found", 500);
    author = { id: a.id, display_name: a.email };
  } else {
    throw new HttpException("Comment has no author", 500);
  }
  // Article summary
  let article_author:
    | IDiscussionBoardUser.ISummary
    | IDiscussionBoardAdmin.ISummary;
  if (article.author_user_id !== null) {
    const au = await MyGlobal.prisma.discussion_board_users.findUnique({
      where: { id: article.author_user_id },
    });
    if (!au) throw new HttpException("Article user author not found", 500);
    article_author = {
      id: au.id,
      email: au.email,
      is_email_verified: au.is_email_verified,
      is_active: au.is_active,
      is_blocked: au.is_blocked,
      created_at: toISOStringSafe(au.created_at),
      updated_at: toISOStringSafe(au.updated_at),
      deleted_at: au.deleted_at ? toISOStringSafe(au.deleted_at) : undefined,
    };
  } else if (article.author_admin_id !== null) {
    const aa = await MyGlobal.prisma.discussion_board_admins.findUnique({
      where: { id: article.author_admin_id },
    });
    if (!aa) throw new HttpException("Article admin author not found", 500);
    article_author = { id: aa.id, display_name: aa.email };
  } else {
    throw new HttpException("Article has no author", 500);
  }
  const article_summary = {
    id: article.id,
    title: article.title,
    created_at: toISOStringSafe(article.created_at),
    updated_at: toISOStringSafe(article.updated_at),
    author: article_author,
  };
  // Fetch attachments
  const attachments =
    await MyGlobal.prisma.discussion_board_comment_attachments.findMany({
      where: { discussion_board_comment_id: comment.id },
    });
  const attachment_summaries = attachments.map((att) => ({
    id: att.id,
    discussion_board_comment_id: att.discussion_board_comment_id,
    file_url: att.file_url,
    original_filename: att.original_filename,
    mime_type: att.mime_type,
    file_size_bytes: att.file_size_bytes,
    created_at: toISOStringSafe(att.created_at),
  }));
  // Assemble IDiscussionBoardComment
  return {
    id: comment.id,
    article: article_summary,
    author,
    body: comment.body,
    attachments: attachment_summaries,
    created_at: toISOStringSafe(comment.created_at),
    updated_at: toISOStringSafe(comment.updated_at),
    deleted_at: now,
  };
}
