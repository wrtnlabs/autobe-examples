import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteDiscussionBoardAdminAttachmentsAttachmentId(props: {
  admin: AdminPayload;
  attachmentId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardAttachment> {
  // Find the attachment record by ID
  const attachment =
    await MyGlobal.prisma.discussion_board_attachments.findUnique({
      where: { id: props.attachmentId },
    });
  if (!attachment) {
    throw new HttpException("Attachment not found", 404);
  }
  // Mark as deleted (soft delete)
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.discussion_board_attachments.update({
    where: { id: props.attachmentId },
    data: { deleted_at: now, updated_at: now },
  });
  return {
    id: updated.id,
    original_filename: updated.original_filename,
    storage_filename: updated.storage_filename,
    size_bytes: updated.size_bytes,
    mime_type: updated.mime_type,
    checksum_sha256: updated.checksum_sha256,
    storage_location: updated.storage_location,
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
