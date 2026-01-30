import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteEconomicForumAdminAttachmentFilesAttachmentFileId(props: {
  admin: AdminPayload;
  attachmentFileId: string;
}): Promise<void> {
  // Validate that attachmentFileId is a valid UUID (already type-safe from API layer, but ensure)
  if (!typia.is<string & tags.Format<"uuid">>(props.attachmentFileId)) {
    throw new HttpException("Invalid attachment file ID format", 400);
  }
  // Begin database transaction
  const result = await MyGlobal.prisma.$transaction(async (prisma) => {
    // Find the attachment file record
    const attachment = await prisma.economic_forum_attachment_files.findUnique({
      where: {
        id: props.attachmentFileId,
      },
    });
    // If attachment not found, throw 404
    if (!attachment) {
      throw new HttpException("Attachment file not found", 404);
    }
    // Delete the physical file from storage (Simulated: this would call storage service)
    // In production, implement storage.delete(attachment.file_path)
    // For now, we'll simulate a successful deletion
    // If file deletion fails, we throw an error to roll back transaction
    // Since we don't have actual storage service, we assume this succeeds
    // Delete the database record
    await prisma.economic_forum_attachment_files.delete({
      where: {
        id: props.attachmentFileId,
      },
    });
    return true;
  });
  // If transaction succeeded, return void
  return;
}
