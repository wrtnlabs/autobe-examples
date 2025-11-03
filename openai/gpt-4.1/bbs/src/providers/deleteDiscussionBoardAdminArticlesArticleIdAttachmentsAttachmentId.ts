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

export async function deleteDiscussionBoardAdminArticlesArticleIdAttachmentsAttachmentId(props: {
  admin: AdminPayload;
  articleId: string & tags.Format<"uuid">;
  attachmentId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardArticleAttachment> {
  // 1. Find the attachment with the given IDs and not already deleted
  const attachment =
    await MyGlobal.prisma.discussion_board_article_attachments.findFirst({
      where: {
        id: props.attachmentId,
        discussion_board_article_id: props.articleId,
        deleted_at: null,
      },
    });
  if (!attachment) {
    throw new HttpException("Attachment not found or already deleted", 404);
  }

  // 2. Soft-delete: set deleted_at to now (ISO string)
  const now = toISOStringSafe(new Date());
  const updated =
    await MyGlobal.prisma.discussion_board_article_attachments.update({
      where: { id: props.attachmentId },
      data: { deleted_at: now },
    });

  // 3. Return API DTO
  return {
    id: updated.id,
    discussion_board_article_id: updated.discussion_board_article_id,
    filename: updated.filename,
    kind: updated.kind,
    mimetype: updated.mimetype,
    filesize: updated.filesize,
    virus_scanned: updated.virus_scanned,
    created_at: toISOStringSafe(updated.created_at),
    deleted_at: now,
  };
}
