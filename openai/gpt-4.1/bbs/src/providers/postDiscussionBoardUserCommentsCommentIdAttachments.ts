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

export async function postDiscussionBoardUserCommentsCommentIdAttachments(props: {
  user: UserPayload;
  commentId: string & tags.Format<"uuid">;
  body: IDiscussionBoardCommentAttachment.ICreate;
}): Promise<IDiscussionBoardCommentAttachment> {
  // Step 1: Validate the parent comment exists and is not deleted
  const comment = await MyGlobal.prisma.discussion_board_comments.findUnique({
    where: { id: props.commentId },
    select: { id: true, deleted_at: true },
  });
  if (!comment || comment.deleted_at !== null) {
    throw new HttpException("Comment not found or has been deleted.", 404);
  }

  // Step 2: Allowed mime types validation
  const allowedMimeTypes = [
    "image/png",
    "image/jpeg",
    "application/pdf",
    "text/plain",
  ];
  if (!allowedMimeTypes.includes(props.body.mime_type)) {
    throw new HttpException("Unsupported mime type.", 400);
  }

  // Step 3: File size validation
  if (
    typeof props.body.file_size_bytes !== "number" ||
    props.body.file_size_bytes < 1 ||
    props.body.file_size_bytes > 10485760
  ) {
    throw new HttpException("Invalid file size. Must be 1-10MB.", 400);
  }

  // Step 4: Max 2 attachments per comment
  const attachmentCount =
    await MyGlobal.prisma.discussion_board_comment_attachments.count({
      where: { discussion_board_comment_id: props.commentId },
    });
  if (attachmentCount >= 2) {
    throw new HttpException("Only 2 attachments are allowed per comment.", 400);
  }

  // Step 5: Duplicate filename check
  const existingAttachment =
    await MyGlobal.prisma.discussion_board_comment_attachments.findFirst({
      where: {
        discussion_board_comment_id: props.commentId,
        original_filename: props.body.original_filename,
      },
      select: { id: true },
    });
  if (existingAttachment) {
    throw new HttpException("Duplicate filename for this comment.", 400);
  }

  // Step 6: Insert the record
  const now = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.discussion_board_comment_attachments.create({
      data: {
        id: v4(),
        discussion_board_comment_id: props.commentId,
        file_url: props.body.file_url,
        original_filename: props.body.original_filename,
        mime_type: props.body.mime_type,
        file_size_bytes: props.body.file_size_bytes,
        created_at: now,
      },
    });

  // Step 7: Return with all required fields, ensuring types
  return {
    id: created.id,
    discussion_board_comment_id: created.discussion_board_comment_id,
    file_url: created.file_url,
    original_filename: created.original_filename,
    mime_type: created.mime_type,
    file_size_bytes: created.file_size_bytes,
    created_at: toISOStringSafe(created.created_at),
  };
}
