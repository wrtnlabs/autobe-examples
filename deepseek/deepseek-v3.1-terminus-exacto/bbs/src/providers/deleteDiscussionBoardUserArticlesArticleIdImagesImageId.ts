import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardUserArticlesArticleIdImagesImageId(props: {
  user: UserPayload;
  articleId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<void> {
  // First verify the article exists
  const article = await MyGlobal.prisma.discussion_board_articles.findFirst({
    where: {
      id: props.articleId,
      deleted_at: null,
    },
    select: {
      id: true,
      discussion_board_user_id: true,
    },
  });
  if (!article) {
    throw new HttpException("Article not found", 404);
  }
  // Check authorization: user must be article author
  if (article.discussion_board_user_id !== props.user.id) {
    throw new HttpException(
      "Access denied: You are not the author of this article",
      403,
    );
  }
  // Verify the image exists and belongs to the specified article
  const image = await MyGlobal.prisma.discussion_board_article_images.findFirst(
    {
      where: {
        id: props.imageId,
        discussion_board_article_id: props.articleId,
      },
    },
  );
  if (!image) {
    throw new HttpException(
      "Image not found or does not belong to the specified article",
      404,
    );
  }
  // Perform the hard delete operation
  await MyGlobal.prisma.discussion_board_article_images.delete({
    where: {
      id: props.imageId,
    },
  });
}
