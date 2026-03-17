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

export async function deleteRedditLikeMemberAttachmentReferencesReferenceId(props: {
  member: AdminPayload;
  referenceId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the attachment reference
  const reference =
    await MyGlobal.prisma.reddit_like_attachment_references.findUnique({
      where: { id: props.referenceId },
      select: {
        id: true,
        attachment_id: true,
      },
    });
  if (reference === null) {
    throw new HttpException("Attachment reference not found", 404);
  }
  // Find the attachment to verify ownership and deletion status
  const attachment = await MyGlobal.prisma.reddit_like_attachments.findUnique({
    where: { id: reference.attachment_id },
    select: {
      id: true,
      uploaded_by_member_id: true,
      deleted_at: true,
    },
  });
  if (attachment === null) {
    throw new HttpException("Attachment not found", 404);
  }
  if (attachment.deleted_at !== null) {
    throw new HttpException("Attachment already deleted", 409);
  }
  if (attachment.uploaded_by_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Delete the attachment - this cascades to delete the reference
  await MyGlobal.prisma.reddit_like_attachments.delete({
    where: { id: attachment.id },
  });
}
