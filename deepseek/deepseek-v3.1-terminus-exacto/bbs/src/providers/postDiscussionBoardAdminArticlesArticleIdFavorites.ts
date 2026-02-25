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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAdminArticlesArticleIdFavorites(props: {
  admin: AdminPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleFavorite.ICreate;
}): Promise<IDiscussionBoardArticleFavorite> {
  // Verify article exists
  await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
    where: { id: props.articleId },
  });
  // Create favorite relationship using collector
  await MyGlobal.prisma.discussion_board_article_favorites.upsert({
    where: {
      discussion_board_user_id_discussion_board_article_id: {
        discussion_board_user_id: props.admin.id,
        discussion_board_article_id: props.articleId,
      },
    },
    create: await DiscussionBoardArticleFavoriteCollector.collect({
      body: props.body,
      discussionBoardUsers: { id: props.admin.id },
      discussionBoardArticles: { id: props.articleId },
    }),
    update: {},
  });
  // Return simple boolean response indicating favorited status
  return {
    favorited: true,
  };
}
