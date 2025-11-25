import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAttachment";

export async function getEconomicBoardPostsPostIdAttachmentsAttachmentId(props: {
  postId: string;
  attachmentId: string;
}): Promise<IEconomicBoardAttachment> {
  const post = await MyGlobal.prisma.economic_board_posts.findUnique({
    where: { id: props.postId },
    select: { status: true, deleted_at: true },
  });

  if (!post) {
    throw new HttpException("Post not found", 404);
  }

  if (post.status !== "published" || post.deleted_at !== null) {
    throw new HttpException("Attachment not found", 404);
  }

  const attachment =
    await MyGlobal.prisma.economic_board_attachments.findUnique({
      where: { id: props.attachmentId, economic_board_post_id: props.postId },
      select: { storage_path: true },
    });

  if (!attachment) {
    throw new HttpException("Attachment not found", 404);
  }

  return attachment.storage_path;
}
