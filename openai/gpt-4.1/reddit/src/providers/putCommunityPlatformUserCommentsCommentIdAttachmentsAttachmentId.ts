import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentAttachment";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putCommunityPlatformUserCommentsCommentIdAttachmentsAttachmentId(props: {
  user: UserPayload;
  commentId: string & tags.Format<"uuid">;
  attachmentId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommentAttachment.IUpdate;
}): Promise<ICommunityPlatformCommentAttachment> {
  // 1. Fetch the attachment and validate association
  const attachment =
    await MyGlobal.prisma.community_platform_comment_attachments.findUnique({
      where: { id: props.attachmentId },
    });
  if (!attachment || attachment.comment_id !== props.commentId) {
    throw new HttpException("Attachment not found for this comment.", 404);
  }

  // 2. Fetch the parent comment
  const comment = await MyGlobal.prisma.community_platform_comments.findUnique({
    where: { id: props.commentId },
  });
  if (!comment) {
    throw new HttpException("Parent comment not found.", 404);
  }

  // 3. Enforce permissions: only the owner/uploader of the attachment or the comment author can update
  const isCommentAuthor = comment.user_id === props.user.id;
  const isAttachmentUploader =
    attachment.user_session_id === props.user.session_id;
  if (!(isCommentAuthor || isAttachmentUploader)) {
    throw new HttpException(
      "Permission denied. Only author or uploader can update attachment.",
      403,
    );
  }

  // 4. Update the metadata (only uri is updatable)
  const updated =
    await MyGlobal.prisma.community_platform_comment_attachments.update({
      where: { id: props.attachmentId },
      data: {
        uri: props.body.uri,
      },
    });

  return {
    id: updated.id,
    comment_id: updated.comment_id,
    user_session_id: updated.user_session_id,
    uri: updated.uri,
    created_at: toISOStringSafe(updated.created_at),
  };
}
