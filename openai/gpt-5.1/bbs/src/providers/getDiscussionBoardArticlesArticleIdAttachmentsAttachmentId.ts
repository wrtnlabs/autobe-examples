import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";

export async function getDiscussionBoardArticlesArticleIdAttachmentsAttachmentId(props: {
  articleId: string & tags.Format<"uuid">;
  attachmentId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardAttachment> {
  const attachment =
    await MyGlobal.prisma.discussion_board_attachments.findFirst({
      where: {
        id: props.attachmentId,
        discussion_board_article_id: props.articleId,
        deleted_at: null,
      },
    });

  if (!attachment) {
    throw new HttpException("Attachment not found", 404);
  }

  return {
    id: attachment.id,
    discussion_board_article_id: attachment.discussion_board_article_id,
    file_uri: attachment.file_uri,
    file_name: attachment.file_name,
    content_type: attachment.content_type,
    file_size: attachment.file_size,
    order_in_article: attachment.order_in_article,
    status: attachment.status,
    created_at: toISOStringSafe(attachment.created_at),
    updated_at: toISOStringSafe(attachment.updated_at),
    deleted_at:
      attachment.deleted_at === null
        ? null
        : toISOStringSafe(attachment.deleted_at),
  };
}
