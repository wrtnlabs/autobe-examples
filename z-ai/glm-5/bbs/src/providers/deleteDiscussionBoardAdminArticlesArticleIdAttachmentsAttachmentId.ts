import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardAdminArticlesArticleIdAttachmentsAttachmentId(props: {
  admin: AdminPayload;
  articleId: string & tags.Format<"uuid">;
  attachmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Verify article exists and is not deleted
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId },
    select: { deleted_at: true },
  });
  if (article === null || article.deleted_at !== null) {
    throw new HttpException("Article not found", 404);
  }
  // 2. Verify attachment exists and belongs to the article
  const attachment =
    await MyGlobal.prisma.discussion_board_article_attachments.findUnique({
      where: { id: props.attachmentId },
      select: { discussion_board_article_id: true },
    });
  if (
    attachment === null ||
    attachment.discussion_board_article_id !== props.articleId
  ) {
    throw new HttpException("Attachment not found", 404);
  }
  // 3. Delete the attachment record (hard delete)
  await MyGlobal.prisma.discussion_board_article_attachments.delete({
    where: { id: props.attachmentId },
  });
}
