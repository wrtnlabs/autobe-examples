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

export async function deleteDiscussionBoardModeratorArticlesArticleIdImagesImageId(props: {
  moderator: ModeratorPayload;
  articleId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardArticleImage> {
  const existingImage =
    await MyGlobal.prisma.discussion_board_article_images.findUnique({
      where: { id: props.imageId },
    });

  if (!existingImage) {
    throw new HttpException("Image not found", 404);
  }

  if (existingImage.discussion_board_article_id !== props.articleId) {
    throw new HttpException(
      "Image does not belong to the specified article",
      400,
    );
  }

  if (existingImage.deleted_at !== null) {
    throw new HttpException("Image has already been deleted", 400);
  }

  const deletedImage =
    await MyGlobal.prisma.discussion_board_article_images.update({
      where: { id: props.imageId },
      data: {
        deleted_at: new Date(),
      },
    });

  return {
    id: deletedImage.id,
    discussion_board_article_id: deletedImage.discussion_board_article_id,
    original_filename: deletedImage.original_filename,
    file_size: deletedImage.file_size,
    content_type: deletedImage.content_type,
    storage_url: deletedImage.storage_url,
    width: deletedImage.width ?? undefined,
    height: deletedImage.height ?? undefined,
    created_at: toISOStringSafe(deletedImage.created_at),
    deleted_at: deletedImage.deleted_at
      ? toISOStringSafe(deletedImage.deleted_at)
      : null,
  };
}
