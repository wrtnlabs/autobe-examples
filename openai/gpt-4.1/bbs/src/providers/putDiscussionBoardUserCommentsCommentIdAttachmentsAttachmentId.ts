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

export async function putDiscussionBoardUserCommentsCommentIdAttachmentsAttachmentId(props: {
  user: UserPayload;
  commentId: string & tags.Format<"uuid">;
  attachmentId: string & tags.Format<"uuid">;
  body: IDiscussionBoardCommentAttachment.IUpdate;
}): Promise<IDiscussionBoardCommentAttachment> {
  const attachment =
    await MyGlobal.prisma.discussion_board_comment_attachments.findUnique({
      where: { id: props.attachmentId },
      include: {
        comment: true,
      },
    });

  if (
    !attachment ||
    !attachment.comment ||
    attachment.discussion_board_comment_id !== props.commentId
  ) {
    throw new HttpException(
      "Attachment or parent comment does not exist.",
      404,
    );
  }
  if (attachment.comment.deleted_at !== null) {
    throw new HttpException(
      "Cannot update attachment under a deleted comment.",
      404,
    );
  }

  if (attachment.comment.discussion_board_user_id !== props.user.id) {
    throw new HttpException(
      "You do not have permission to update this attachment.",
      403,
    );
  }

  let updated;
  try {
    updated = await MyGlobal.prisma.discussion_board_comment_attachments.update(
      {
        where: { id: props.attachmentId },
        data: {
          file_url: props.body.file_url,
          original_filename: props.body.original_filename,
          mime_type: props.body.mime_type,
          file_size_bytes: props.body.file_size_bytes,
        },
      },
    );
  } catch (err) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as any).code === "P2002"
    ) {
      throw new HttpException(
        "Attachment filename must be unique for this comment.",
        409,
      );
    }
    throw err;
  }

  return {
    id: updated.id,
    discussion_board_comment_id: updated.discussion_board_comment_id,
    file_url: updated.file_url,
    original_filename: updated.original_filename,
    mime_type: updated.mime_type,
    file_size_bytes: updated.file_size_bytes,
    created_at: toISOStringSafe(updated.created_at),
  };
}
