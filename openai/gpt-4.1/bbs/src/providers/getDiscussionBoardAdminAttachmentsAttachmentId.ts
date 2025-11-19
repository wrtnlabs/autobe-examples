import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getDiscussionBoardAdminAttachmentsAttachmentId(props: {
  admin: AdminPayload;
  attachmentId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardAttachment> {
  const row = await MyGlobal.prisma.discussion_board_attachments.findUnique({
    where: { id: props.attachmentId, deleted_at: null },
  });
  if (!row) {
    throw new HttpException("Attachment not found", 404);
  }
  return {
    id: row.id,
    original_filename: row.original_filename,
    storage_filename: row.storage_filename,
    size_bytes: row.size_bytes,
    mime_type: row.mime_type,
    checksum_sha256: row.checksum_sha256,
    storage_location: row.storage_location,
    deleted_at:
      row.deleted_at !== null && typeof row.deleted_at !== "undefined"
        ? toISOStringSafe(row.deleted_at)
        : undefined,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
  };
}
