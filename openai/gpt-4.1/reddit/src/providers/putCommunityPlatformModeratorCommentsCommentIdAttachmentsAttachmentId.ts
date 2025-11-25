import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentAttachment";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function putCommunityPlatformModeratorCommentsCommentIdAttachmentsAttachmentId(props: {
  moderator: ModeratorPayload;
  commentId: string & tags.Format<"uuid">;
  attachmentId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommentAttachment.IUpdate;
}): Promise<ICommunityPlatformCommentAttachment> {
  const attachment =
    await MyGlobal.prisma.community_platform_comment_attachments.findUnique({
      where: { id: props.attachmentId },
    });
  if (!attachment || attachment.comment_id !== props.commentId) {
    throw new HttpException(
      "Attachment not found for the specified comment",
      404,
    );
  }

  const updated =
    await MyGlobal.prisma.community_platform_comment_attachments.update({
      where: { id: props.attachmentId },
      data: { uri: props.body.uri },
    });

  return {
    id: updated.id,
    comment_id: updated.comment_id,
    user_session_id: updated.user_session_id,
    uri: updated.uri,
    created_at: toISOStringSafe(updated.created_at),
  };
}
