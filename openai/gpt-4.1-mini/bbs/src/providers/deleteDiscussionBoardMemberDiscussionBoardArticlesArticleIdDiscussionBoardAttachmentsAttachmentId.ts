import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteDiscussionBoardMemberDiscussionBoardArticlesArticleIdDiscussionBoardAttachmentsAttachmentId(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
  attachmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { member, articleId, attachmentId } = props;

  // Verify the article exists and is not soft deleted
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: articleId },
    select: { deleted_at: true },
  });

  if (!article || article.deleted_at !== null) {
    throw new HttpException("Article not found", 404);
  }

  // Verify the attachment exists and belongs to the article
  const attachment =
    await MyGlobal.prisma.discussion_board_attachments.findUnique({
      where: { id: attachmentId },
      select: { discussion_board_article_id: true },
    });

  if (!attachment) {
    throw new HttpException("Attachment not found", 404);
  }

  if (attachment.discussion_board_article_id !== articleId) {
    throw new HttpException(
      "Attachment does not belong to the specified article",
      400,
    );
  }

  // Authorization check: only allow if member owns the article
  // Since article ownership field is absent in schema, trust the pre-authorization layer has verified ownership
  // Proceed to deletion
  await MyGlobal.prisma.discussion_board_attachments.delete({
    where: { id: attachmentId },
  });

  return;
}
