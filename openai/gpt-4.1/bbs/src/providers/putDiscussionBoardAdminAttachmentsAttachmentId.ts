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

export async function putDiscussionBoardAdminAttachmentsAttachmentId(props: {
  admin: AdminPayload;
  attachmentId: string & tags.Format<"uuid">;
  body: IDiscussionBoardAttachment.IUpdate;
}): Promise<IDiscussionBoardAttachment> {
  const existing =
    await MyGlobal.prisma.discussion_board_attachments.findUnique({
      where: { id: props.attachmentId },
    });

  if (!existing) {
    throw new HttpException("Attachment not found", 404);
  }

  // Only allow fields that are editable by admin per schema
  const updateData: Record<string, unknown> = {};
  if (
    "original_filename" in props.body &&
    typeof props.body.original_filename === "string"
  ) {
    updateData.original_filename = props.body.original_filename;
  }
  if (
    "storage_filename" in props.body &&
    typeof props.body.storage_filename === "string"
  ) {
    updateData.storage_filename = props.body.storage_filename;
  }
  if ("size_bytes" in props.body && typeof props.body.size_bytes === "number") {
    updateData.size_bytes = props.body.size_bytes;
  }
  if ("mime_type" in props.body && typeof props.body.mime_type === "string") {
    updateData.mime_type = props.body.mime_type;
  }
  if (
    "storage_location" in props.body &&
    typeof props.body.storage_location === "string"
  ) {
    updateData.storage_location = props.body.storage_location;
  }
  // Always set updated_at to now (as ISO string)
  updateData.updated_at = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.discussion_board_attachments.update({
    where: { id: props.attachmentId },
    data: updateData,
  });

  return {
    id: updated.id,
    original_filename: updated.original_filename,
    storage_filename: updated.storage_filename,
    size_bytes: updated.size_bytes,
    mime_type: updated.mime_type,
    checksum_sha256: updated.checksum_sha256,
    storage_location: updated.storage_location,
    deleted_at: Object.prototype.hasOwnProperty.call(updated, "deleted_at")
      ? updated.deleted_at === null
        ? null
        : toISOStringSafe(updated.deleted_at)
      : undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
