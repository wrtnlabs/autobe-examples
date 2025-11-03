import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function getDiscussionBoardUserArticlesArticleId(props: {
  user: UserPayload;
  articleId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardArticle> {
  const { user, articleId } = props;

  // Fetch the article by articleId (must not be soft-deleted for users)
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: articleId },
  });

  if (article === null || article.deleted_at !== null) {
    throw new HttpException("Article not found or has been deleted.", 404);
  }

  // Fetch author user for author summary (never deleted/locked: all authorship is public)
  const author = await MyGlobal.prisma.discussion_board_users.findUnique({
    where: { id: article.author_user_id },
  });

  if (author === null) {
    throw new HttpException("Author not found.", 404);
  }

  // Fetch attachments for this article (non-deleted only)
  const attachments =
    await MyGlobal.prisma.discussion_board_article_attachments.findMany({
      where: {
        discussion_board_article_id: article.id,
        deleted_at: null,
      },
    });

  // Map attachments to response type
  const mappedAttachments = attachments.map((att) => ({
    id: att.id,
    discussion_board_article_id: att.discussion_board_article_id,
    filename: att.filename,
    kind: att.kind,
    mimetype: att.mimetype,
    filesize: att.filesize,
    virus_scanned: att.virus_scanned,
    created_at: toISOStringSafe(att.created_at),
    deleted_at:
      att.deleted_at === null ? undefined : toISOStringSafe(att.deleted_at),
  }));

  // Count non-deleted comments for this article
  const comments_count =
    await MyGlobal.prisma.discussion_board_article_comments.count({
      where: {
        discussion_board_article_id: article.id,
        deleted_at: null,
      },
    });

  // Assemble and return the IDiscussionBoardArticle
  return {
    id: article.id,
    title: article.title,
    body: article.body,
    author: {
      id: author.id,
      display_name: author.display_name,
      avatar_url: author.avatar_url === null ? undefined : author.avatar_url,
    },
    attachments: mappedAttachments,
    created_at: toISOStringSafe(article.created_at),
    updated_at: toISOStringSafe(article.updated_at),
    deleted_at:
      article.deleted_at === null
        ? undefined
        : toISOStringSafe(article.deleted_at),
    comments_count: comments_count,
  };
}
