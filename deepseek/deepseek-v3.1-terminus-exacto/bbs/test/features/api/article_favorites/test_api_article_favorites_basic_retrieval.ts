import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFavorite";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_article_favorites_create } from "../../../generate/generate_random_discussion_board_user_article_favorites_create";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_favorite } from "../../../prepare/prepare_random_discussion_board_article_favorite";

export async function test_api_article_favorites_basic_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Note: Section creation would typically require admin privileges
  // For this test, we'll assume sections already exist in the system
  // and use a valid section ID pattern
  // Create multiple articles to favorite
  const articles = await ArrayUtil.asyncRepeat(3, async () => {
    return await generate_random_discussion_board_user_articles_create(
      userConnection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 5,
            wordMax: 10,
          }),
          content: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 3,
            sentenceMax: 6,
          }),
          section_id: typia.random<string & tags.Format<"uuid">>(),
          status: "published" as const,
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  });
  // Favorite all articles
  const favorites = await ArrayUtil.asyncRepeat(
    articles.length,
    async (index) => {
      return await generate_random_discussion_board_user_article_favorites_create(
        userConnection,
        {
          body: {
            discussion_board_article_id: articles[index].id,
          } satisfies IDiscussionBoardArticleFavorite.ICreate,
        },
      );
    },
  );
  // Retrieve favorites with pagination
  const retrievedFavorites =
    await api.functional.discussionBoard.user.article_favorites.index(
      userConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticleFavorite.IRequest,
      },
    );
  typia.assert(retrievedFavorites);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    retrievedFavorites.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    retrievedFavorites.pagination.limit,
    10,
  );
  TestValidator.equals(
    "total records",
    retrievedFavorites.pagination.records,
    articles.length,
  );
  TestValidator.equals("total pages", retrievedFavorites.pagination.pages, 1);
  // Validate favorites data
  TestValidator.equals(
    "number of favorites returned",
    retrievedFavorites.data.length,
    articles.length,
  );
  // Verify each favorite contains correct article information
  retrievedFavorites.data.forEach((favoriteArticle, index) => {
    const originalArticle = articles.find(
      (article) => article.id === favoriteArticle.id,
    );
    TestValidator.predicate(
      `article ${index} exists in original articles`,
      () => originalArticle !== undefined,
    );
    if (originalArticle) {
      TestValidator.equals(
        `article ${index} title matches`,
        favoriteArticle.title,
        originalArticle.title,
      );
      TestValidator.equals(
        `article ${index} status matches`,
        favoriteArticle.status,
        originalArticle.status,
      );
      TestValidator.equals(
        `article ${index} author id matches`,
        favoriteArticle.author.id,
        originalArticle.author.id,
      );
      TestValidator.equals(
        `article ${index} section id matches`,
        favoriteArticle.section.id,
        originalArticle.section.id,
      );
    }
  });
  // Verify favorites are ordered by creation date (newest first)
  const creationDates = retrievedFavorites.data.map((favorite) =>
    new Date(favorite.created_at).getTime(),
  );
  const isDescending = creationDates.every(
    (date, index, array) => index === 0 || date <= array[index - 1],
  );
  TestValidator.predicate(
    "favorites are ordered by creation date (newest first)",
    isDescending,
  );
}
