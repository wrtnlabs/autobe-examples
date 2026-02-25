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
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardUserArticlesArticleIdFavorites(props: {
  user: UserPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleFavorite.ICreate;
}): Promise<IDiscussionBoardArticleFavorite> {
  // Verify article exists
  await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
    where: { id: props.articleId },
  });
  try {
    // Create favorite using collector
    const favorite =
      await MyGlobal.prisma.discussion_board_article_favorites.create({
        data: await DiscussionBoardArticleFavoriteCollector.collect({
          body: props.body,
          discussionBoardUsers: { id: props.user.id },
          discussionBoardArticles: { id: props.articleId },
        }),
      });
    return { favorited: true };
  } catch (error) {
    // Handle duplicate favorite (unique constraint violation)
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      // Unique constraint violation means favorite already exists
      return { favorited: true };
    }
    throw error;
  }
}
