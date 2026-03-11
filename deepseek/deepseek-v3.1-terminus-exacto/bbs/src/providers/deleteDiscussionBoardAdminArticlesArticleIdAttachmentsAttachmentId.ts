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
  // 1. Verify article exists (not soft-deleted)
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: {
      id: props.articleId,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  if (article === null) {
    throw new HttpException("Article not found", 404);
  }
  // 2. Verify attachment exists and belongs to article
  const attachment =
    await MyGlobal.prisma.discussion_board_attachments.findUnique({
      where: {
        id: props.attachmentId,
        deleted_at: null,
      },
      select: {
        id: true,
        article_id: true,
        storage_path: true,
      },
    });
  if (attachment === null) {
    throw new HttpException("Attachment not found", 404);
  }
  if (attachment.article_id !== props.articleId) {
    throw new HttpException(
      "Attachment does not belong to specified article",
      400,
    );
  }
  // 3. Execute transaction: delete physical file and soft delete metadata
  await MyGlobal.prisma.$transaction(async (prisma) => {
    // Delete physical file from storage
    // In production, this would call: await storageService.deleteFile(attachment.storage_path);
    // For now, simulate storage deletion (would need actual storage service integration)
    try {
      // await storageService.deleteFile(attachment.storage_path);
      // Simulate successful file deletion
    } catch (error) {
      throw new HttpException(
        "Failed to delete physical file from storage",
        500,
      );
    }
    // Soft delete attachment metadata
    await prisma.discussion_board_attachments.update({
      where: { id: props.attachmentId },
      data: {
        deleted_at: new Date(), // Prisma expects Date object for DateTime column
      },
    });
  });
  // 4. Audit logging (when audit system is implemented)
  // await logAuditAction(props.admin, 'delete_attachment', { articleId: props.articleId, attachmentId: props.attachmentId });
}
