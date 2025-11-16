import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteDiscussionBoardAdminCommentsCommentIdAttachmentsAttachmentId(props: {
  admin: AdminPayload;
  commentId: string & tags.Format<"uuid">;
  attachmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Retrieve the attachment and validate existence/association
  const attachment =
    await MyGlobal.prisma.discussion_board_comment_attachments.findUnique({
      where: {
        id: props.attachmentId,
      },
    });

  if (attachment === null) {
    throw new HttpException("Attachment not found.", 404);
  }
  if (attachment.discussion_board_comment_id !== props.commentId) {
    throw new HttpException(
      "Attachment does not belong to the specified comment.",
      404,
    );
  }

  // Step 2: Fetch comment for existence validation
  const comment = await MyGlobal.prisma.discussion_board_comments.findUnique({
    where: {
      id: props.commentId,
    },
  });
  if (comment === null) {
    throw new HttpException("Comment not found.", 404);
  }

  // Step 3: Delete the attachment record
  await MyGlobal.prisma.discussion_board_comment_attachments.delete({
    where: {
      id: props.attachmentId,
    },
  });

  return;
}
