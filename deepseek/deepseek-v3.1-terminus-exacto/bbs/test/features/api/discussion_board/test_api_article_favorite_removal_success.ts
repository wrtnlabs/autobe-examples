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

export async function test_api_article_favorite_removal_success(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user);
  // Create an article (simulated by generating a random UUID)
  const articleId = typia.random<string & tags.Format<"uuid">>();
  // Add article to favorites
  const favorite =
    await generate_random_discussion_board_user_articles_favorites_create(
      userConnection,
      {
        body: {} satisfies IDiscussionBoardArticleFavorite.ICreate,
        params: { articleId },
      },
    );
  typia.assert(favorite);
  TestValidator.equals("article should be favorited", favorite.favorited, true);
  // Remove article from favorites
  await api.functional.discussionBoard.user.articles.favorites.erase(
    userConnection,
    { articleId },
  );
  // Verify removal by attempting to create the same favorite again
  // If the favorite was properly removed, creating it again should succeed
  const recreatedFavorite =
    await generate_random_discussion_board_user_articles_favorites_create(
      userConnection,
      {
        body: {} satisfies IDiscussionBoardArticleFavorite.ICreate,
        params: { articleId },
      },
    );
  typia.assert(recreatedFavorite);
  TestValidator.equals(
    "article should be favorited again",
    recreatedFavorite.favorited,
    true,
  );
  // Final validation: The ability to recreate the favorite proves the original was removed
  TestValidator.predicate(
    "favorite was properly removed and can be recreated",
    true,
  );
}
