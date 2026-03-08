import { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardArticlesArticleIdAttachmentsAttachmentId(props: {
  articleId: string & tags.Format<"uuid">;
  attachmentId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardArticleAttachment> {
  const attachment =
    await MyGlobal.prisma.discussion_board_article_attachments.findUniqueOrThrow(
      {
        where: { id: props.attachmentId },
        select: {
          id: true,
          type: true,
          name: true,
          extension: true,
          size: true,
          created_at: true,
          article: {
            select: {
              id: true,
              deleted_at: true,
            },
          } satisfies Prisma.discussion_board_articlesFindManyArgs,
        },
      },
    );
  // Verify attachment belongs to the specified article
  if (attachment.article.id !== props.articleId) {
    throw new HttpException("Attachment not found", 404);
  }
  // Verify article is not soft-deleted
  if (attachment.article.deleted_at !== null) {
    throw new HttpException("Attachment not found", 404);
  }
  return {
    id: attachment.id,
    type: typia.assert<"file" | "image">(attachment.type),
    name: attachment.name,
    extension: attachment.extension,
    size: attachment.size,
    created_at: toISOStringSafe(attachment.created_at),
  } satisfies IDiscussionBoardArticleAttachment;
}
