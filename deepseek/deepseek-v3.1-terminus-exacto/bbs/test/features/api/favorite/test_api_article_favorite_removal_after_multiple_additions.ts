import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticleFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFavorite";
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
import { generate_random_discussion_board_user_articles_favorites_create } from "../../../generate/generate_random_discussion_board_user_articles_favorites_create";
import { prepare_random_discussion_board_article_favorite } from "../../../prepare/prepare_random_discussion_board_article_favorite";

export async function test_api_article_favorite_removal_after_multiple_additions(
  connection: api.IConnection,
): Promise<void> {
  // Create user-specific connection
  const userConnection: api.IConnection = { host: connection.host };
  // 1. Authenticate as a regular user
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user);
  // Generate a random article ID for testing
  const articleId = typia.random<string & tags.Format<"uuid">>();
  // 2. First favorite creation
  const firstFavorite =
    await api.functional.discussionBoard.user.articles.favorites.create(
      userConnection,
      {
        articleId,
        body: {} satisfies IDiscussionBoardArticleFavorite.ICreate,
      },
    );
  typia.assert(firstFavorite);
  TestValidator.predicate(
    "first favorite should be true",
    firstFavorite.favorited === true,
  );
  // 3. First favorite removal
  await api.functional.discussionBoard.user.articles.favorites.erase(
    userConnection,
    { articleId },
  );
  // 4. Second favorite creation
  const secondFavorite =
    await api.functional.discussionBoard.user.articles.favorites.create(
      userConnection,
      {
        articleId,
        body: {} satisfies IDiscussionBoardArticleFavorite.ICreate,
      },
    );
  typia.assert(secondFavorite);
  TestValidator.predicate(
    "second favorite should be true",
    secondFavorite.favorited === true,
  );
  // 5. Final favorite removal
  await api.functional.discussionBoard.user.articles.favorites.erase(
    userConnection,
    { articleId },
  );
}
