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
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: {
      id: props.articleId,
      deleted_at: null,
    },
  });
  if (article === null) {
    throw new HttpException("Article not found", 404);
  }
  const image =
    await MyGlobal.prisma.discussion_board_article_images.findUnique({
      where: {
        id: props.imageId,
        discussion_board_article_id: props.articleId,
        deleted_at: null,
      },
    });
  if (image === null) {
    throw new HttpException("Image not found", 404);
  }
  await MyGlobal.prisma.discussion_board_article_images.update({
    where: {
      id: props.imageId,
    },
    data: {
      deleted_at: new Date(),
    },
  });
}
