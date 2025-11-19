import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";

export async function getDiscussionBoardArticlesArticleIdAttachmentsAttachmentId(props: {
  articleId: string & tags.Format<"uuid">;
  attachmentId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardArticleAttachment> {
  const attachment =
    await MyGlobal.prisma.discussion_board_article_attachments.findUnique({
      where: {
        id: props.attachmentId,
      },
    });

  if (!attachment) {
    throw new HttpException("Attachment not found", 404);
  }

  if (attachment.deleted_at !== null) {
    throw new HttpException("Attachment not found", 404);
  }

  if (attachment.discussion_board_article_id !== props.articleId) {
    throw new HttpException("Attachment not found", 404);
  }

  return {
    id: attachment.id,
    discussion_board_article_id: attachment.discussion_board_article_id,
    discussion_board_member_id: attachment.discussion_board_member_id,
    type: attachment.type,
    format: attachment.format,
    size: attachment.size,
    original_filename: attachment.original_filename,
    storage_path: attachment.storage_path,
    created_at: toISOStringSafe(attachment.created_at),
    updated_at: toISOStringSafe(attachment.updated_at),
    deleted_at: attachment.deleted_at
      ? toISOStringSafe(attachment.deleted_at)
      : null,
  };
}
