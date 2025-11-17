import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function deleteEconomicBoardModeratorPostsPostIdAttachmentsAttachmentId(props: {
  moderator: ModeratorPayload;
  postId: string;
  attachmentId: string;
}): Promise<void> {
  const attachment = await MyGlobal.prisma.economic_board_attachments.findFirst(
    {
      where: {
        id: props.attachmentId,
        economic_board_post_id: props.postId,
        deleted_at: null,
      },
    },
  );

  if (!attachment) {
    throw new HttpException("Attachment not found or already deleted", 404);
  }

  const post = await MyGlobal.prisma.economic_board_posts.findUnique({
    where: { id: props.postId },
  });

  if (!post) {
    throw new HttpException("Post not found", 404);
  }

  if (post.deleted_at !== null) {
    throw new HttpException(
      "Cannot delete attachment from a deleted post",
      403,
    );
  }

  await MyGlobal.prisma.economic_board_attachments.update({
    where: { id: props.attachmentId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
