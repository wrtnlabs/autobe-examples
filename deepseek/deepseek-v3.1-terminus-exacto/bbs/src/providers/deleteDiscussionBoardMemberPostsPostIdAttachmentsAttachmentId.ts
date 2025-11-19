import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteDiscussionBoardMemberPostsPostIdAttachmentsAttachmentId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  attachmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify the post exists and belongs to the member
  const post = await MyGlobal.prisma.discussion_board_posts.findFirst({
    where: {
      id: props.postId,
      actor_type: "member",
      deleted_at: null,
    },
  });

  if (!post) {
    throw new HttpException("Post not found", 404);
  }

  // Verify the attachment exists and belongs to both the post and the member
  const attachment =
    await MyGlobal.prisma.discussion_board_post_attachments.findFirst({
      where: {
        id: props.attachmentId,
        discussion_board_post_id: props.postId,
        discussion_board_member_id: props.member.id,
        deleted_at: null,
      },
    });

  if (!attachment) {
    throw new HttpException(
      "Attachment not found or you don't have permission to delete this attachment",
      404,
    );
  }

  // Perform hard delete of the attachment
  await MyGlobal.prisma.discussion_board_post_attachments.delete({
    where: {
      id: props.attachmentId,
    },
  });
}
