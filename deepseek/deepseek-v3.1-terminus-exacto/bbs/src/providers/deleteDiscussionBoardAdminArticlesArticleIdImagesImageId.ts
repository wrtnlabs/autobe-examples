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
  articleId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify the image exists and belongs to the specified article
  const image = await MyGlobal.prisma.discussion_board_article_images.findFirst(
    {
      where: {
        id: props.imageId,
        discussion_board_article_id: props.articleId,
      },
    },
  );
  if (image === null) {
    throw new HttpException(
      "Image not found or does not belong to the specified article",
      404,
    );
  }
  // Perform hard delete of the image record
  await MyGlobal.prisma.discussion_board_article_images.delete({
    where: {
      id: props.imageId,
    },
  });
}
