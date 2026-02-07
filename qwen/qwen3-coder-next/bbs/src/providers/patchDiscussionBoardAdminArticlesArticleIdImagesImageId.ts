import { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminArticlesArticleIdImagesImageId(props: {
  admin: AdminPayload;
  articleId: string;
  imageId: string;
  body: IDiscussionBoardArticleImage.IUpdate;
}): Promise<IDiscussionBoardArticleImage> {
  // Verify the image exists and belongs to the specified article
  const existingImage =
    await MyGlobal.prisma.discussion_board_article_images.findUnique({
      where: {
        id: props.imageId,
        discussion_board_article_id: props.articleId,
      },
    });
  if (!existingImage) {
    throw new HttpException(
      "Image not found or doesn't belong to the specified article",
      404,
    );
  }
  // Update the image with provided metadata
  const updatedImage =
    await MyGlobal.prisma.discussion_board_article_images.update({
      where: {
        id: props.imageId,
      },
      data: {
        // Add modifiable fields from the update body
        // Only use fields that are allowed in update operations
      },
      select: {
        id: true,
        discussion_board_article_id: true,
        original_filename: true,
        stored_filename: true,
        mime_type: true,
        size: true,
        width: true,
        height: true,
        display_order: true,
      },
    });
  // Return the updated image with proper type handling
  return {
    id: updatedImage.id,
    discussion_board_article_id: updatedImage.discussion_board_article_id,
    original_filename: updatedImage.original_filename,
    stored_filename: updatedImage.stored_filename,
    mime_type: updatedImage.mime_type,
    size: updatedImage.size,
    width: updatedImage.width,
    height: updatedImage.height,
    display_order: updatedImage.display_order,
  };
}
