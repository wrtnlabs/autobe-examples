import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";

export async function getDiscussionBoardArticlesArticleIdAttachmentsAttachmentId(props: {
  articleId: string & tags.Format<"uuid">;
  attachmentId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardArticleAttachment> {
  // Check if article exists
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId },
  });
  if (!article) {
    throw new HttpException("Article not found", 404);
  }

  // Check if attachment exists and is associated with the article
  const attachment =
    await MyGlobal.prisma.discussion_board_article_attachments.findUnique({
      where: {
        id: props.attachmentId,
        article_id: props.articleId,
      },
    });
  if (!attachment) {
    throw new HttpException(
      "Attachment not found or not associated with the article",
      404,
    );
  }

  // Return attachment details
  return {
    id: attachment.id,
    name: attachment.file_name,
    url: `/attachments/${attachment.id}`,
  };
}
