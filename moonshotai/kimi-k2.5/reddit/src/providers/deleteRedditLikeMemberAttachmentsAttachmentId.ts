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

export async function deleteRedditLikeMemberAttachmentsAttachmentId(props: {
  member: AdminPayload;
  attachmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find attachment or throw 404
  const attachment =
    await MyGlobal.prisma.reddit_like_attachments.findUniqueOrThrow({
      where: { id: props.attachmentId },
      select: {
        id: true,
        uploaded_by_member_id: true,
      },
    });
  // Verify ownership - only uploader can delete
  if (attachment.uploaded_by_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Check if attachment is referenced by any entity
  const referenceCount =
    await MyGlobal.prisma.reddit_like_attachment_references.count({
      where: { attachment_id: props.attachmentId },
    });
  if (referenceCount > 0) {
    throw new HttpException("Attachment is in use by other entities", 409);
  }
  // Soft delete by setting deleted_at
  await MyGlobal.prisma.reddit_like_attachments.update({
    where: { id: props.attachmentId },
    data: {
      deleted_at: new Date(),
    },
  });
}
