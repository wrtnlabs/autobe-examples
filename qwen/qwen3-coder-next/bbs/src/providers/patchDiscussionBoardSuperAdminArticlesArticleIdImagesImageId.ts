import { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminArticlesArticleIdImagesImageId(props: {
  superAdmin: SuperadminPayload;
  articleId: string;
  imageId: string;
  body: IDiscussionBoardArticleImage.IUpdate;
}): Promise<IDiscussionBoardArticleImage> {
  // Verify image belongs to specified article
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
    throw new HttpException("Image does not belong to specified article", 404);
  }
  // Update the image with provided fields
  const updated = await MyGlobal.prisma.discussion_board_article_images.update({
    where: {
      id: props.imageId,
    },
    data: props.body,
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
  // Return the updated image
  return {
    id: updated.id,
    discussion_board_article_id: updated.discussion_board_article_id,
    original_filename: updated.original_filename,
    stored_filename: updated.stored_filename,
    mime_type: updated.mime_type,
    size: updated.size,
    width: updated.width,
    height: updated.height,
    display_order: updated.display_order,
  } satisfies IDiscussionBoardArticleImage;
}
