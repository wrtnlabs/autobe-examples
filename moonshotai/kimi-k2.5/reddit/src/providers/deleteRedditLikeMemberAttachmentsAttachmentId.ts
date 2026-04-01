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

export async function deleteRedditLikeMemberAttachmentsAttachmentId(props: {
  member: MemberPayload;
  attachmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the attachment record
  const attachment =
    await MyGlobal.prisma.reddit_like_attachments.findUniqueOrThrow({
      where: { id: props.attachmentId },
      select: { id: true, uploaded_by_member_id: true },
    });
  // Verify ownership - only the original uploader can delete
  if (attachment.uploaded_by_member_id !== props.member.id) {
    throw new HttpException(
      "Forbidden - You can only delete your own attachments",
      403,
    );
  }
  // Soft delete by setting deleted_at timestamp
  await MyGlobal.prisma.reddit_like_attachments.update({
    where: { id: props.attachmentId },
    data: {
      deleted_at: new Date(),
    },
  });
}
