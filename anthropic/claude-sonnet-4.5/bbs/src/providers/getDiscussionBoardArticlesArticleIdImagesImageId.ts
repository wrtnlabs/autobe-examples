import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";

export async function getDiscussionBoardArticlesArticleIdImagesImageId(props: {
  articleId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardArticleImage> {
  const image =
    await MyGlobal.prisma.discussion_board_article_images.findUnique({
      where: {
        id: props.imageId,
      },
    });

  if (!image) {
    throw new HttpException("Image not found", 404);
  }

  if (image.discussion_board_article_id !== props.articleId) {
    throw new HttpException("Image not found", 404);
  }

  if (image.deleted_at !== null) {
    throw new HttpException("Image not found", 404);
  }

  return {
    id: image.id,
    discussion_board_article_id: image.discussion_board_article_id,
    original_filename: image.original_filename,
    file_size: image.file_size,
    content_type: image.content_type,
    storage_url: image.storage_url,
    width: image.width ?? undefined,
    height: image.height ?? undefined,
    created_at: toISOStringSafe(image.created_at),
    deleted_at: null,
  };
}
