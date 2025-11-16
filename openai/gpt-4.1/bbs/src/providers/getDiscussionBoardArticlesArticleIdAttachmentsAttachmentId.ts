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
      },
    });

  if (!record) {
    throw new HttpException(
      "Attachment not found for the specified article.",
      404,
    );
  }

  return {
    id: record.id,
    article_id: record.article_id,
    uri: record.uri,
    file_name: record.file_name,
    file_type: record.file_type,
    file_size: record.file_size,
    uploaded_at: toISOStringSafe(record.uploaded_at),
  };
}
