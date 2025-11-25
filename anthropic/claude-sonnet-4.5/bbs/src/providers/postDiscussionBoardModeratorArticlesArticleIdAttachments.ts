import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function postDiscussionBoardModeratorArticlesArticleIdAttachments(props: {
  moderator: ModeratorPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleAttachment.ICreate;
}): Promise<IDiscussionBoardArticleAttachment> {
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId },
  });

  if (!article || article.deleted_at !== null) {
    throw new HttpException("Article not found", 404);
  }

  const attachment =
    await MyGlobal.prisma.discussion_board_article_attachments.create({
      data: {
        id: v4(),
        discussion_board_article_id: props.articleId,
        discussion_board_member_id: props.moderator.id,
        type: props.body.type,
        format: props.body.format,
        size: props.body.size,
        original_filename: props.body.original_filename,
        storage_path: props.body.storage_path,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
    });

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
