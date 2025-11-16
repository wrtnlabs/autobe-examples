import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentAttachment";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function getDiscussionBoardUserCommentsCommentIdAttachmentsAttachmentId(props: {
  user: UserPayload;
  commentId: string & tags.Format<"uuid">;
  attachmentId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardCommentAttachment> {
  // Find the comment and verify ownership and not deleted
  const comment = await MyGlobal.prisma.discussion_board_comments.findUnique({
    where: { id: props.commentId },
    select: {
      id: true,
      discussion_board_user_id: true,
      deleted_at: true,
    },
  });

  if (!comment || comment.deleted_at !== null) {
    throw new HttpException("Comment not found or has been deleted", 404);
  }
  if (comment.discussion_board_user_id !== props.user.id) {
    throw new HttpException("Forbidden", 403);
  }

  // Fetch attachment: must be attached to this comment
  const attachment =
    await MyGlobal.prisma.discussion_board_comment_attachments.findUnique({
      where: { id: props.attachmentId },
    });
  if (
    !attachment ||
    attachment.discussion_board_comment_id !== props.commentId
  ) {
    throw new HttpException("Attachment not found", 404);
  }

  return {
    id: attachment.id,
    discussion_board_comment_id: attachment.discussion_board_comment_id,
    file_url: attachment.file_url,
    original_filename: attachment.original_filename,
    mime_type: attachment.mime_type,
    file_size_bytes: attachment.file_size_bytes,
    created_at: toISOStringSafe(attachment.created_at),
  };
}
