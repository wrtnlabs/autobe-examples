import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function deleteCommunityPlatformModeratorCommentsCommentIdAttachmentsAttachmentId(props: {
  moderator: ModeratorPayload;
  commentId: string & tags.Format<"uuid">;
  attachmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const attachment =
    await MyGlobal.prisma.community_platform_comment_attachments.findUnique({
      where: { id: props.attachmentId },
    });
  if (!attachment) {
    throw new HttpException("Attachment not found", 404);
  }
  if (attachment.comment_id !== props.commentId) {
    throw new HttpException(
      "Attachment is not associated with the provided comment",
      404,
    );
  }
  // Moderator authorization permitted by contract; no further checks needed
  await MyGlobal.prisma.community_platform_comment_attachments.delete({
    where: { id: props.attachmentId },
  });
}
