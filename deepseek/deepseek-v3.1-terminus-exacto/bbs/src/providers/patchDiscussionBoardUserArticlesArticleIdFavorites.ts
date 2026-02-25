import { IDiscussionBoardArticleFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFavorite";
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

export async function patchDiscussionBoardUserArticlesArticleIdFavorites(props: {
  user: UserPayload;
  articleId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardArticleFavorite.IStatus> {
  // First validate that the article exists and is accessible
  const article = await MyGlobal.prisma.discussion_board_articles.findFirst({
    where: {
      id: props.articleId,
      deleted_at: null,
      status: "published",
    },
  });
  if (!article) {
    throw new HttpException("Article not found or not accessible", 404);
  }
  // Use transaction for atomic toggle operation
  const result = await MyGlobal.prisma.$transaction(async (tx) => {
    // Check if favorite already exists
    const existingFavorite =
      await tx.discussion_board_article_favorites.findFirst({
        where: {
          discussion_board_user_id: props.user.id,
          discussion_board_article_id: props.articleId,
        },
      });
    if (existingFavorite) {
      // Remove the favorite
      await tx.discussion_board_article_favorites.delete({
        where: { id: existingFavorite.id },
      });
      return false;
    } else {
      // Create new favorite with proper date handling
      await tx.discussion_board_article_favorites.create({
        data: {
          id: v4(),
          discussion_board_user_id: props.user.id,
          discussion_board_article_id: props.articleId,
          created_at: new Date(),
        },
      });
      return true;
    }
  });
  return { favorited: result };
}
