import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putDiscussionBoardAdminArticlesArticleId(props: {
  admin: AdminPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticle.IUpdate;
}): Promise<IDiscussionBoardArticle> {
  // 1. Fetch article (ensure not soft-deleted)
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId },
  });
  if (!article || article.deleted_at !== null) {
    throw new HttpException("Article not found or already deleted", 404);
  }

  // 2. Update core article fields if present
  const patch: Record<string, unknown> = {};
  if (Object.prototype.hasOwnProperty.call(props.body, "title"))
    patch.title = props.body.title;
  if (Object.prototype.hasOwnProperty.call(props.body, "body"))
    patch.body = props.body.body;
  patch.updated_at = toISOStringSafe(new Date());
  if (Object.keys(patch).length > 1) {
    await MyGlobal.prisma.discussion_board_articles.update({
      where: { id: props.articleId },
      data: patch,
    });
  }

  // 3. Skipping attachment update due to lack of id; only retrieve latest attachments for response
  // 4. Compose response using current values
  const updated =
    await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
      where: { id: props.articleId },
    });
  const authorDb =
    await MyGlobal.prisma.discussion_board_users.findUniqueOrThrow({
      where: { id: updated.author_user_id },
    });
  const author: IDiscussionBoardUser.ISummary = {
    id: authorDb.id,
    display_name: authorDb.display_name,
    avatar_url:
      typeof authorDb.avatar_url === "string" ? authorDb.avatar_url : null,
  };
  const attachments =
    await MyGlobal.prisma.discussion_board_article_attachments.findMany({
      where: {
        discussion_board_article_id: props.articleId,
        deleted_at: null,
      },
    });
  const comments_count =
    await MyGlobal.prisma.discussion_board_article_comments.count({
      where: {
        discussion_board_article_id: props.articleId,
        deleted_at: null,
      },
    });

  return {
    id: updated.id,
    title: updated.title,
    body: updated.body,
    author,
    attachments: attachments.map((att) => ({
      id: att.id,
      discussion_board_article_id: att.discussion_board_article_id,
      filename: att.filename,
      kind: att.kind,
      mimetype: att.mimetype,
      filesize: att.filesize,
      virus_scanned: att.virus_scanned,
      created_at: toISOStringSafe(att.created_at),
      deleted_at:
        att.deleted_at !== null ? toISOStringSafe(att.deleted_at) : null,
    })),
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== null ? toISOStringSafe(updated.deleted_at) : null,
    comments_count,
  };
}
