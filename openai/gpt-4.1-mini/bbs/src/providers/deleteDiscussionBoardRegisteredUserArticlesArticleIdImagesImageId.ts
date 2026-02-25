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
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId },
    select: { id: true, registered_user_id: true },
  });
  if (!article) {
    throw new HttpException("Article not found", 404);
  }
  if (article.registered_user_id !== props.registeredUser.id) {
    const admin =
      await MyGlobal.prisma.discussion_board_administrators.findFirst({
        where: { registered_user_id: props.registeredUser.id },
        select: { id: true },
      });
    if (!admin) {
      throw new HttpException("Forbidden", 403);
    }
  }
  const image =
    await MyGlobal.prisma.discussion_board_article_images.findUnique({
      where: { id: props.imageId },
      select: { id: true, discussion_board_article_id: true },
    });
  if (!image || image.discussion_board_article_id !== props.articleId) {
    throw new HttpException("Image not found in the specified article", 404);
  }
  await MyGlobal.prisma.discussion_board_article_images.delete({
    where: { id: props.imageId },
  });
}
