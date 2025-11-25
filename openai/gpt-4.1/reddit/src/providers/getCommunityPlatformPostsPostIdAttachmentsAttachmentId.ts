import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformPostAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostAttachment";

export async function getCommunityPlatformPostsPostIdAttachmentsAttachmentId(props: {
  postId: string & tags.Format<"uuid">;
  attachmentId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformPostAttachment> {
  const attachment =
    await MyGlobal.prisma.community_platform_post_attachments.findFirst({
      where: {
        id: props.attachmentId,
        post_id: props.postId,
      },
    });

  if (!attachment) {
    throw new HttpException("Attachment not found for specified post.", 404);
  }

  return {
    id: attachment.id,
    post_id: attachment.post_id,
    uri: attachment.uri,
    mimetype: attachment.mimetype,
    created_at: toISOStringSafe(attachment.created_at),
  };
}
