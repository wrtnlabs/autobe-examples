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
  const record =
    await MyGlobal.prisma.discussion_board_article_attachments.findFirst({
      where: {
        id: props.attachmentId,
        article_id: props.articleId,
        deleted_at: null,
      },
    });

  if (!record) {
    throw new HttpException(
      "Attachment not found or does not belong to this article.",
      404,
    );
  }

  return {
    id: record.id,
    article_id: record.article_id,
    file_name: record.file_name,
    mime_type: record.mime_type,
    file_size: record.file_size,
    file_uri: record.file_uri,
    created_at: toISOStringSafe(record.created_at),
    deleted_at:
      record.deleted_at === null || record.deleted_at === undefined
        ? undefined
        : toISOStringSafe(record.deleted_at),
  };
}
