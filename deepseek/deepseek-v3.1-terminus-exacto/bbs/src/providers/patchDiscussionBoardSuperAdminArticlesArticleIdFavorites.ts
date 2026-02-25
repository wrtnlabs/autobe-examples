import { IDiscussionBoardArticleFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFavorite";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminArticlesArticleIdFavorites(props: {
  superAdmin: SuperAdminPayload;
  articleId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardArticleFavorite.IStatus> {
  // Verify article exists and is accessible (published and not deleted)
  await MyGlobal.prisma.discussion_board_articles.findFirstOrThrow({
    where: {
      id: props.articleId,
      deleted_at: null,
      status: "published",
    },
  });
  // Check if favorite already exists
  const existingFavorite =
    await MyGlobal.prisma.discussion_board_article_favorites.findFirst({
      where: {
        discussion_board_user_id: props.superAdmin.id,
        discussion_board_article_id: props.articleId,
      },
    });
  if (existingFavorite) {
    // Remove favorite
    await MyGlobal.prisma.discussion_board_article_favorites.delete({
      where: { id: existingFavorite.id },
    });
    return { favorited: false };
  } else {
    // Add favorite
    await MyGlobal.prisma.discussion_board_article_favorites.create({
      data: {
        id: v4(),
        discussion_board_user_id: props.superAdmin.id,
        discussion_board_article_id: props.articleId,
        created_at: toISOStringSafe(new Date()),
      },
    });
    return { favorited: true };
  }
}
