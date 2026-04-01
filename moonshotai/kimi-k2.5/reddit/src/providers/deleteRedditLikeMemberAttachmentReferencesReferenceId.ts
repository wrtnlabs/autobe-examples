import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteRedditLikeMemberAttachmentReferencesReferenceId(props: {
  member: MemberPayload;
  referenceId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the attachment reference with its attachment details
  const reference =
    await MyGlobal.prisma.reddit_like_attachment_references.findUnique({
      where: {
        id: props.referenceId,
      },
      select: {
        id: true,
        attachment_id: true,
        attachment: {
          select: {
            id: true,
            deleted_at: true,
            uploaded_by_member_id: true,
          },
        },
      },
    });
  // Verify reference exists
  if (reference === null) {
    throw new HttpException("Attachment reference not found", 404);
  }
  // Verify attachment exists and is not deleted
  if (reference.attachment === null) {
    throw new HttpException("Attachment not found", 404);
  }
  if (reference.attachment.deleted_at !== null) {
    throw new HttpException("Attachment already deleted", 409);
  }
  // Verify the requesting member is the owner
  if (reference.attachment.uploaded_by_member_id !== props.member.id) {
    throw new HttpException(
      "Forbidden - you can only delete your own attachments",
      403,
    );
  }
  // Delete the reference (cascades to attachment due to onDelete: Cascade)
  await MyGlobal.prisma.reddit_like_attachment_references.delete({
    where: {
      id: props.referenceId,
    },
  });
}
