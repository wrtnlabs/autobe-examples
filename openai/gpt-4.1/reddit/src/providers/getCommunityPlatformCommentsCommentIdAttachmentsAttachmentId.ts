import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentAttachment";

export async function getCommunityPlatformCommentsCommentIdAttachmentsAttachmentId(props: {
  commentId: string & tags.Format<"uuid">;
  attachmentId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommentAttachment> {
  const record =
    await MyGlobal.prisma.community_platform_comment_attachments.findFirst({
      where: {
        id: props.attachmentId,
        comment_id: props.commentId,
      },
    });

  if (!record) {
    throw new HttpException(
      "Attachment not found or not linked to the specified comment",
      404,
    );
  }

  return {
    id: record.id,
    comment_id: record.comment_id,
    user_session_id: record.user_session_id,
    uri: record.uri,
    created_at: toISOStringSafe(record.created_at),
  };
}
