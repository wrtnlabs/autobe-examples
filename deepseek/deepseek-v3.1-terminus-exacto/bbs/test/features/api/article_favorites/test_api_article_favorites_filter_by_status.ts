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

export async function test_api_article_favorites_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // Create a user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user);
  // Create articles with different statuses
  const statuses = ["draft", "published", "archived"] as const;
  const articles: IDiscussionBoardArticle[] = [];
  for (const status of statuses) {
    const article = await generate_random_discussion_board_user_articles_create(
      userConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.content({ paragraphs: 2 }),
          section_id: typia.random<string & tags.Format<"uuid">>(),
          status: status,
        } satisfies DeepPartial<IDiscussionBoardArticle.ICreate>,
      },
    );
    typia.assert(article);
    articles.push(article);
  }
  // Add all articles to favorites
  const favorites: IDiscussionBoardArticleFavorite[] = [];
  for (const article of articles) {
    const favorite =
      await generate_random_discussion_board_user_article_favorites_create(
        userConnection,
        {
          body: {
            discussion_board_article_id: article.id,
          } satisfies DeepPartial<IDiscussionBoardArticleFavorite.ICreate>,
        },
      );
    typia.assert(favorite);
    favorites.push(favorite);
  }
  // Test filtering by each status
  for (const status of statuses) {
    const filteredFavorites =
      await api.functional.discussionBoard.user.article_favorites.index(
        userConnection,
        {
          body: {
            status: status,
          } satisfies IDiscussionBoardArticleFavorite.IRequest,
        },
      );
    typia.assert(filteredFavorites);
    // Verify that only articles with the specified status are returned
    TestValidator.equals(
      `should return only ${status} articles`,
      filteredFavorites.data.length,
      articles.filter((a) => a.status === status).length,
    );
    // Verify that all returned articles have the correct status
    for (const favorite of filteredFavorites.data) {
      TestValidator.equals(
        `article status should be ${status}`,
        favorite.status,
        status,
      );
    }
  }
  // Test filtering with non-existent status (should return empty)
  const emptyFilteredFavorites =
    await api.functional.discussionBoard.user.article_favorites.index(
      userConnection,
      {
        body: {
          status: "draft",
          created_at_from: new Date().toISOString(), // Filter for favorites created after now (none exist)
        } satisfies IDiscussionBoardArticleFavorite.IRequest,
      },
    );
  typia.assert(emptyFilteredFavorites);
  TestValidator.equals(
    "should return empty results for non-matching date filter",
    emptyFilteredFavorites.data.length,
    0,
  );
}
