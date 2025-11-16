import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function postDiscussionBoardModeratorArticlesArticleIdImages(props: {
  moderator: ModeratorPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleImage.ICreate;
}): Promise<IDiscussionBoardArticleImage> {
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId },
  });

  if (!article) {
    throw new HttpException("Article not found", 404);
  }

  const imageId: string & tags.Format<"uuid"> = v4();

  const created = await MyGlobal.prisma.discussion_board_article_images.create({
    data: {
      id: imageId,
      discussion_board_article_id: props.articleId,
      original_filename: props.body.original_filename,
      file_size: props.body.file_size,
      content_type: props.body.content_type,
      storage_url: props.body.storage_url,
      width: props.body.width ?? null,
      height: props.body.height ?? null,
      created_at: new Date(),
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    discussion_board_article_id: created.discussion_board_article_id,
    original_filename: created.original_filename,
    file_size: created.file_size,
    content_type: created.content_type,
    storage_url: created.storage_url,
    width: created.width ?? undefined,
    height: created.height ?? undefined,
    created_at: toISOStringSafe(created.created_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
