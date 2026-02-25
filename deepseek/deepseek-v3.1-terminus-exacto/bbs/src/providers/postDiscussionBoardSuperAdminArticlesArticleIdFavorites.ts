import { IDiscussionBoardArticleFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFavorite";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardArticleFavoriteCollector } from "../collectors/DiscussionBoardArticleFavoriteCollector";
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardSuperAdminArticlesArticleIdFavorites(props: {
  superAdmin: SuperAdminPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleFavorite.ICreate;
}): Promise<IDiscussionBoardArticleFavorite> {
  // Verify article exists
  await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
    where: { id: props.articleId },
  });
  // Check if favorite already exists
  const existingFavorite =
    await MyGlobal.prisma.discussion_board_article_favorites.findFirst({
      where: {
        discussion_board_user_id: props.superAdmin.id,
        discussion_board_article_id: props.articleId,
      },
    });
  if (existingFavorite !== null) {
    // Already favorited, return true
    return { favorited: true };
  }
  // Prepare IEntity objects for collector
  const discussionBoardUsers = { id: props.superAdmin.id };
  const discussionBoardArticles = { id: props.articleId };
  // Create favorite using collector
  const data = await DiscussionBoardArticleFavoriteCollector.collect({
    body: props.body,
    discussionBoardUsers,
    discussionBoardArticles,
  });
  await MyGlobal.prisma.discussion_board_article_favorites.create({
    data,
  });
  return { favorited: true };
}
