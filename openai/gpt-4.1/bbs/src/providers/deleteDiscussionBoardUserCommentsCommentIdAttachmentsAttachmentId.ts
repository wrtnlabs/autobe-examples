import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteDiscussionBoardUserCommentsCommentIdAttachmentsAttachmentId(props: {
  user: UserPayload;
  commentId: string & tags.Format<"uuid">;
  attachmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // (1) Find the attachment by id and comment link
  const attachment =
    await MyGlobal.prisma.discussion_board_comment_attachments.findUnique({
      where: { id: props.attachmentId },
    });
  if (
    !attachment ||
    attachment.discussion_board_comment_id !== props.commentId
  ) {
    throw new HttpException("Attachment not found for this comment.", 404);
  }

  // (2) Retrieve the comment and verify user permission
  const comment = await MyGlobal.prisma.discussion_board_comments.findUnique({
    where: { id: props.commentId },
  });
  if (!comment || comment.deleted_at !== null) {
    throw new HttpException("Comment not found or has been deleted.", 404);
  }
  if (comment.discussion_board_user_id !== props.user.id) {
    throw new HttpException(
      "You do not have permission to delete this attachment.",
      403,
    );
  }

  // (3) Remove the physical file resource (placeholder, assuming a storage utility exists)
  // await FileStorageUtil.delete(attachment.file_url);

  // (4) Delete the attachment record
  await MyGlobal.prisma.discussion_board_comment_attachments.delete({
    where: { id: props.attachmentId },
  });
}
