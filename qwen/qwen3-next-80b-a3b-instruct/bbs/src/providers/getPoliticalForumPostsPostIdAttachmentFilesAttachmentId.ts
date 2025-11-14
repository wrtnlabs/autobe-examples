import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPoliticalForumPostAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumPostAttachment";

export async function getPoliticalForumPostsPostIdAttachmentFilesAttachmentId(props: {
  postId: string;
  attachmentId: string;
}): Promise<IPoliticalForumPostAttachment> {
  const attachment =
    await MyGlobal.prisma.political_forum_post_attachments.findUnique({
      where: {
        id: props.attachmentId,
        political_forum_post_id: props.postId,
        deleted_at: null,
      },
    });

  if (!attachment) {
    throw new HttpException("Attachment not found", 404);
  }

  return attachment.file_path;
}
