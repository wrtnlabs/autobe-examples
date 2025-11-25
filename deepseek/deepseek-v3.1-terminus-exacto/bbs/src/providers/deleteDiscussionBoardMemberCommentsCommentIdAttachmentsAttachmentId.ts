import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteDiscussionBoardMemberCommentsCommentIdAttachmentsAttachmentId(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
  attachmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // First, verify the attachment exists and belongs to the specified comment
  const attachment =
    await MyGlobal.prisma.discussion_board_comment_attachments.findFirst({
      where: {
        id: props.attachmentId,
        discussion_board_comment_id: props.commentId,
        deleted_at: null,
      },
    });

  if (!attachment) {
    throw new HttpException("Attachment not found", 404);
  }

  // Verify ownership - only the uploader can delete
  if (attachment.discussion_board_member_id !== props.member.id) {
    throw new HttpException(
      "You do not have permission to delete this attachment",
      403,
    );
  }

  // Perform hard deletion
  await MyGlobal.prisma.discussion_board_comment_attachments.delete({
    where: {
      id: props.attachmentId,
    },
  });
}
