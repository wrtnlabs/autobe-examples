import { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
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

export async function getDiscussionBoardArticlesArticleIdImagesImageId(props: {
  articleId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardArticleImage> {
  const image =
    await MyGlobal.prisma.discussion_board_article_images.findUniqueOrThrow({
      where: { id: props.imageId },
      select: {
        id: true,
        original_filename: true,
        storage_path: true,
        file_size: true,
        mime_type: true,
        width: true,
        height: true,
        created_at: true,
        article: {
          select: {
            id: true,
            deleted_at: true,
          },
        },
      },
    });
  if (image.article.id !== props.articleId) {
    throw new HttpException("Image not found for this article", 404);
  }
  if (image.article.deleted_at !== null) {
    throw new HttpException("Article not found", 404);
  }
  return {
    id: image.id,
    original_filename: image.original_filename,
    storage_path: image.storage_path,
    file_size: image.file_size,
    mime_type: image.mime_type,
    width: image.width,
    height: image.height,
    created_at: image.created_at.toISOString(),
  };
}
