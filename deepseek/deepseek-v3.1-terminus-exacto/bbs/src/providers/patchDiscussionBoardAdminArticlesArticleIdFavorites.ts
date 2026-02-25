import { IDiscussionBoardArticleFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFavorite";
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

export async function patchDiscussionBoardAdminArticlesArticleIdFavorites(props: {
  admin: AdminPayload;
  articleId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardArticleFavorite.IStatus> {
  // Verify the article exists and is accessible
  const article =
    await MyGlobal.prisma.discussion_board_articles.findFirstOrThrow({
      where: {
        id: props.articleId,
        deleted_at: null,
        status: { in: ["draft", "published"] },
      },
    });
  // Use transaction for atomic operation
  const result = await MyGlobal.prisma.$transaction(async (tx) => {
    // Check if favorite already exists
    const existingFavorite =
      await tx.discussion_board_article_favorites.findUnique({
        where: {
          discussion_board_user_id_discussion_board_article_id: {
            discussion_board_user_id: props.admin.id,
            discussion_board_article_id: props.articleId,
          },
        },
      });
    if (existingFavorite) {
      // Delete existing favorite
      await tx.discussion_board_article_favorites.delete({
        where: { id: existingFavorite.id },
      });
      return false;
    } else {
      // Create new favorite
      await tx.discussion_board_article_favorites.create({
        data: {
          id: v4(),
          discussion_board_user_id: props.admin.id,
          discussion_board_article_id: props.articleId,
          created_at: new Date(),
        },
      });
      return true;
    }
  });
  return { favorited: result };
}
