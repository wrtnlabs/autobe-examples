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

/**
 * Test the successful creation of an article favorite relationship.
 * 1. Authenticate as a regular user to access the favorites functionality
 * 2. Create an article that can be favorited (using available data)
 * 3. Favorite the created article
 * 4. Validate that the favorite record is created with correct relationships
 */
export async function test_api_article_favorite_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // Create user-specific connection
  const userConnection: api.IConnection = { host: connection.host };
  // Step 1: Authenticate as a regular user
  const authorizedUser = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(authorizedUser);
  // Update user connection with authorization token
  userConnection.headers = {
    Authorization: `Bearer ${authorizedUser.token.access}`,
  };
  // Step 2: Create an article using the generation function
  // Note: The generation function will handle section creation internally
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
        // The generation function will handle section_id internally
        status: "published" as const,
        section_id: "" as string & tags.Format<"uuid">, // Add required section_id property
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Step 3: Create article favorite
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
  // Step 4: Validate favorite relationships
  TestValidator.equals(
    "favorite author matches authenticated user",
    favorite.author.id,
    authorizedUser.id,
  );
  TestValidator.equals(
    "favorite article matches created article",
    favorite.article.id,
    article.id,
  );
  TestValidator.predicate("favorite has valid creation timestamp", () => {
    const createdAt = new Date(favorite.created_at);
    return !isNaN(createdAt.getTime()) && createdAt <= new Date();
  });
  // Additional validations
  TestValidator.equals(
    "author display name matches",
    favorite.author.display_name,
    authorizedUser.display_name,
  );
  TestValidator.equals(
    "article title matches",
    favorite.article.title,
    article.title,
  );
  TestValidator.equals(
    "article status matches",
    favorite.article.status,
    article.status,
  );
}