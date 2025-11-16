import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteDiscussionBoardAdminArticlesArticleIdAttachmentsAttachmentId(props: {
  admin: AdminPayload;
  articleId: string & tags.Format<"uuid">;
  attachmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Find the attachment by attachmentId AND articleId
  const attachment =
    await MyGlobal.prisma.discussion_board_article_attachments.findFirst({
      where: {
        id: props.attachmentId,
        article_id: props.articleId,
      },
    });
  if (!attachment) {
    throw new HttpException("Attachment not found for this article.", 404);
  }
  // Step 2: Confirm parent article exists (optional since foreign key enforced, but explicit for clarity)
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId },
  });
  if (!article) {
    throw new HttpException("Article not found.", 404);
  }
  // Step 3: (Business: As admin can delete any attachment)
  // Step 4: Delete the attachment record
  await MyGlobal.prisma.discussion_board_article_attachments.delete({
    where: { id: props.attachmentId },
  });
  // Step 5: Remove the storage file using the attachment URI
  // No global storage removal implemented at this layer; operation complete.
}
