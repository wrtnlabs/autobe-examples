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
 * Test the successful removal of an article from user's favorites list.
 *
 * This test validates the complete workflow of adding an article to favorites
 * and then removing it, ensuring proper database operations and user permissions.
 */
export async function test_api_article_favorite_removal_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated user account
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
  // Note: Section creation is not available in current utility functions
  // Using a random UUID for section_id since we cannot create sections
  // This assumes sections exist in the test environment
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  // 2. Create an article to be favorited
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 1 }),
        section_id: sectionId,
        status: "published" as const,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 3. Add the article to user's favorites
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
  // 4. Verify the favorite was created correctly
  TestValidator.equals(
    "favorite article ID matches",
    favorite.article.id,
    article.id,
  );
  TestValidator.equals("favorite user ID matches", favorite.author.id, user.id);
  // 5. Delete the favorite using the target operation
  // No utility function available for DELETE endpoint, using SDK directly
  await api.functional.discussionBoard.user.article_favorites.erase(
    userConnection,
    {
      favoriteId: favorite.id,
    },
  );
  // 6. Validate that attempting to delete the same favorite again should fail
  // This confirms the favorite was actually removed from the database
  await TestValidator.httpError(
    "favorite should not exist after deletion",
    404,
    async () => {
      await api.functional.discussionBoard.user.article_favorites.erase(
        userConnection,
        {
          favoriteId: favorite.id,
        },
      );
    },
  );
}
