import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFavorite";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
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
import { DiscussionBoardArticleFavoriteTransformer } from "../transformers/DiscussionBoardArticleFavoriteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardUserArticleFavorites(props: {
  user: UserPayload;
  body: IDiscussionBoardArticleFavorite.ICreate;
}): Promise<IDiscussionBoardArticleFavorite> {
  // Verify article exists, is accessible, and not deleted
  const article = await MyGlobal.prisma.discussion_board_articles.findFirst({
    where: {
      id: props.body.discussion_board_article_id,
      deleted_at: null,
      status: "published", // Ensure article is published and accessible
    },
    include: {
      section: true, // Include section to verify accessibility
    },
  });
  if (!article) {
    throw new HttpException("Article not found or not accessible", 404);
  }
  // Check if section containing the article is active
  if (article.section.status !== "active") {
    throw new HttpException("Article section is not active", 403);
  }
  try {
    // Create favorite using collector pattern with transaction for consistency
    const created = await MyGlobal.prisma.$transaction(async (tx) => {
      // Use atomic create with unique constraint protection
      return await tx.discussion_board_article_favorites.create({
        data: await DiscussionBoardArticleFavoriteCollector.collect({
          body: props.body,
          discussionBoardUsers: { id: props.user.id },
          discussionBoardUserSessions: { id: props.user.session_id },
        }),
        ...DiscussionBoardArticleFavoriteTransformer.select(),
      });
    });
    // Return complete favorite object using transformer
    return await DiscussionBoardArticleFavoriteTransformer.transform(created);
  } catch (error) {
    // Handle unique constraint violation gracefully
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new HttpException("Article already favorited by this user", 400);
    }
    throw error; // Re-throw other errors
  }
}
