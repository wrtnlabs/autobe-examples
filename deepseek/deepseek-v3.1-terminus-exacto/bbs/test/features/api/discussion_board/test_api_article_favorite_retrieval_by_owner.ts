import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFavorite";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_article_favorite_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create and authenticate a user
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
  // Step 2: Create an article that can be favorited
  // Since sections are admin-managed, we'll use the generation function which handles section creation
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
        section_id: typia.random<string & tags.Format<"uuid">>(),
        status: "published" as const,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Step 3: Create the favorite record
  const favorite =
    await generate_random_discussion_board_user_article_favorites_create(
      userConnection,
      {
        body: {
          discussion_board_article_id: article.id,
        } satisfies IDiscussionBoardArticleFavorite.ICreate,
      },
    );
  typia.assert(favorite);
  // Step 4: Retrieve the favorite using the favorite ID
  const retrievedFavorite =
    await api.functional.discussionBoard.user.article_favorites.at(
      userConnection,
      {
        favoriteId: favorite.id,
      },
    );
  typia.assert(retrievedFavorite);
  // Step 5: Validate the retrieved favorite information
  TestValidator.equals(
    "favorite ID matches",
    retrievedFavorite.id,
    favorite.id,
  );
  TestValidator.equals(
    "created at timestamp matches",
    retrievedFavorite.created_at,
    favorite.created_at,
  );
  // Validate author information matches the authenticated user
  TestValidator.equals(
    "author ID matches user ID",
    retrievedFavorite.author.id,
    user.id,
  );
  TestValidator.equals(
    "author display name matches",
    retrievedFavorite.author.display_name,
    user.display_name,
  );
  TestValidator.equals(
    "author bio matches",
    retrievedFavorite.author.bio,
    user.bio,
  );
  // Validate article summary information
  TestValidator.equals(
    "article ID matches",
    retrievedFavorite.article.id,
    article.id,
  );
  TestValidator.equals(
    "article title matches",
    retrievedFavorite.article.title,
    article.title,
  );
  TestValidator.equals(
    "article status matches",
    retrievedFavorite.article.status,
    article.status,
  );
  // Validate timestamps are valid ISO date-time strings
  TestValidator.predicate("created_at is valid ISO date-time", () => {
    const date = new Date(retrievedFavorite.created_at);
    return !isNaN(date.getTime());
  });
  TestValidator.predicate("author created_at is valid ISO date-time", () => {
    const date = new Date(retrievedFavorite.author.created_at);
    return !isNaN(date.getTime());
  });
  TestValidator.predicate("article created_at is valid ISO date-time", () => {
    const date = new Date(retrievedFavorite.article.created_at);
    return !isNaN(date.getTime());
  });
}
