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

export async function deleteDiscussionBoardAdminArticlesArticleIdImagesImageId(props: {
  admin: AdminPayload;
  articleId: string;
  imageId: string;
}): Promise<void> {
  // Validate UUID format
  if (
    !props.articleId.match(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    )
  ) {
    throw new HttpException("Invalid article ID format", 400);
  }
  if (
    !props.imageId.match(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    )
  ) {
    throw new HttpException("Invalid image ID format", 400);
  }
  const image =
    await MyGlobal.prisma.discussion_board_article_images.findUnique({
      where: { id: props.imageId },
    });
  if (!image) {
    throw new HttpException("Image not found", 404);
  }
  if (image.discussion_board_article_id !== props.articleId) {
    throw new HttpException(
      "Image does not belong to the specified article",
      400,
    );
  }
  await MyGlobal.prisma.discussion_board_article_images.delete({
    where: { id: props.imageId },
  });
}
