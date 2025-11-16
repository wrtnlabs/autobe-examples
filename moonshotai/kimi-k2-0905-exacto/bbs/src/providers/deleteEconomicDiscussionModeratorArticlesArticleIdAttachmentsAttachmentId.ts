import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function deleteEconomicDiscussionModeratorArticlesArticleIdAttachmentsAttachmentId(props: {
  moderator: ModeratorPayload;
  articleId: string;
  attachmentId: string;
}): Promise<void> {
  // Verify the article exists
  const article = await MyGlobal.prisma.economic_discussion_articles.findUnique(
    {
      where: { id: props.articleId },
    },
  );

  if (!article) {
    throw new HttpException("Article not found", 404);
  }

  // Verify the attachment exists
  const attachment =
    await MyGlobal.prisma.economic_discussion_attachments.findUnique({
      where: { id: props.attachmentId },
    });

  if (!attachment) {
    throw new HttpException("Attachment not found", 404);
  }

  // Verify the attachment belongs to this article
  if (attachment.economic_discussion_article_id !== props.articleId) {
    throw new HttpException("Attachment does not belong to this article", 400);
  }

  // Delete the attachment
  await MyGlobal.prisma.economic_discussion_attachments.delete({
    where: { id: props.attachmentId },
  });
}
