import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getDiscussionBoardAdminArticlesArticleIdAttachmentsAttachmentId(props: {
  admin: AdminPayload;
  articleId: string & tags.Format<"uuid">;
  attachmentId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardArticleAttachment> {
  const attachment =
    await MyGlobal.prisma.discussion_board_article_attachments.findFirst({
      where: {
        id: props.attachmentId,
        discussion_board_article_id: props.articleId,
        deleted_at: null,
      },
    });
  if (!attachment) {
    throw new HttpException("Attachment not found or deleted", 404);
  }

  const article = await MyGlobal.prisma.discussion_board_articles.findFirst({
    where: {
      id: props.articleId,
      deleted_at: null,
    },
  });
  if (!article) {
    throw new HttpException("Article not found or deleted", 404);
  }

  return {
    id: attachment.id,
    discussion_board_article_id: attachment.discussion_board_article_id,
    filename: attachment.filename,
    kind: attachment.kind,
    mimetype: attachment.mimetype,
    filesize: attachment.filesize,
    virus_scanned: attachment.virus_scanned,
    created_at: toISOStringSafe(attachment.created_at),
    // deleted_at is undefined since where deleted_at: null fetched
  };
}
