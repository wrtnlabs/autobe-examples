import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function deleteDiscussionBoardModeratorArticlesArticleIdAttachmentsAttachmentId(props: {
  moderator: ModeratorPayload;
  articleId: string & tags.Format<"uuid">;
  attachmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId },
  });

  if (!article) {
    throw new HttpException("Article not found", 404);
  }

  const attachment =
    await MyGlobal.prisma.discussion_board_article_attachments.findUnique({
      where: { id: props.attachmentId },
    });

  if (!attachment || attachment.article_id !== props.articleId) {
    throw new HttpException(
      "Attachment not found or does not belong to the specified article",
      404,
    );
  }

  await MyGlobal.prisma.discussion_board_article_attachments.delete({
    where: { id: props.attachmentId },
  });
}
