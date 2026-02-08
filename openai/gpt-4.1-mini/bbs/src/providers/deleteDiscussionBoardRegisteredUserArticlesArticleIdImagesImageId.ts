import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardRegisteredUserArticlesArticleIdImagesImageId(props: {
  registeredUser: RegistereduserPayload;
  articleId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Check that the article exists and is owned by the registered user
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId },
    select: { registered_user_id: true },
  });
  if (!article) throw new HttpException("Article not found", 404);
  if (article.registered_user_id !== props.registeredUser.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Check that the image exists and belongs to the article
  const image =
    await MyGlobal.prisma.discussion_board_article_images.findUnique({
      where: { id: props.imageId },
      select: { discussion_board_article_id: true },
    });
  if (!image || image.discussion_board_article_id !== props.articleId) {
    throw new HttpException("Image not found", 404);
  }
  // Perform deletion in a transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.discussion_board_article_images.delete({
      where: { id: props.imageId },
    });
  });
}
