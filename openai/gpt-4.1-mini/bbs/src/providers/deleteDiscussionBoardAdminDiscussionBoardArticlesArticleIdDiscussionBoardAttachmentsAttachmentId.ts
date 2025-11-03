import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteDiscussionBoardAdminDiscussionBoardArticlesArticleIdDiscussionBoardAttachmentsAttachmentId(props: {
  admin: AdminPayload;
  articleId: string & tags.Format<"uuid">;
  attachmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, articleId, attachmentId } = props;

  // Step 1: Find the article to verify existence and ownership
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: articleId },
    select: { id: true },
  });

  if (article === null) {
    throw new HttpException("Article not found", 404);
  }

  // Authorization: admins allowed any
  // For members ownership check required, here admin only so allowed

  // Step 2: Find the attachment and check it belongs to given articleId
  const attachment =
    await MyGlobal.prisma.discussion_board_attachments.findUnique({
      where: { id: attachmentId },
      select: { discussion_board_article_id: true },
    });

  if (attachment === null) {
    throw new HttpException("Attachment not found", 404);
  }

  if (attachment.discussion_board_article_id !== articleId) {
    throw new HttpException(
      "Attachment does not belong to the specified article",
      400,
    );
  }

  // Step 3: Delete the attachment (hard delete)
  await MyGlobal.prisma.discussion_board_attachments.delete({
    where: { id: attachmentId },
  });
}
