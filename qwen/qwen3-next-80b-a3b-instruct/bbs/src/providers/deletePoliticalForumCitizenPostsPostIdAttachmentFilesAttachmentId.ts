import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CitizenPayload } from "../decorators/payload/CitizenPayload";

export async function deletePoliticalForumCitizenPostsPostIdAttachmentFilesAttachmentId(props: {
  citizen: CitizenPayload;
  postId: string;
  attachmentId: string;
}): Promise<void> {
  const attachmentWithPost =
    await MyGlobal.prisma.political_forum_post_attachments.findUnique({
      where: {
        id: props.attachmentId,
      },
      include: {
        post: true,
      },
    });

  if (!attachmentWithPost || !attachmentWithPost.post) {
    throw new HttpException("Attachment not found", 404);
  }

  if (attachmentWithPost.post.citizen_id !== props.citizen.id) {
    throw new HttpException(
      "Access denied: You can only delete your own attachments",
      403,
    );
  }

  if (attachmentWithPost.deleted_at !== null) {
    throw new HttpException("Attachment already deleted", 404);
  }

  await MyGlobal.prisma.political_forum_post_attachments.delete({
    where: {
      id: props.attachmentId,
    },
  });
}
