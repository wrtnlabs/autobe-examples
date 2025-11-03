import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function deleteDiscussionBoardModeratorArticlesArticleIdImagesImageId(props: {
  moderator: ModeratorPayload;
  articleId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { moderator, articleId, imageId } = props;

  // Verify the image exists and belongs to the specified article
  const image = await MyGlobal.prisma.discussion_board_article_images.findFirst(
    {
      where: {
        id: imageId,
        discussion_board_article_id: articleId,
        deleted_at: null,
      },
    },
  );

  if (!image) {
    throw new HttpException("Image not found or already deleted", 404);
  }

  // Perform soft delete by setting deleted_at timestamp
  const now = toISOStringSafe(new Date());

  await MyGlobal.prisma.discussion_board_article_images.update({
    where: { id: imageId },
    data: {
      deleted_at: now,
    },
  });
}
