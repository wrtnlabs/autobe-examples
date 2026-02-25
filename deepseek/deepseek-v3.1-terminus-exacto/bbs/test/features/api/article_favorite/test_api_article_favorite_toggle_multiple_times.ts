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
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_article_favorite_toggle_multiple_times(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for user
  const userConnection: api.IConnection = { host: connection.host };
  // Step 1: Authenticate user using utility function
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    },
  });
  // Step 2: Create an article for the user to favorite
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {},
  );
  typia.assert(article);
  // Step 3: Initial toggle (should set favorited=true)
  const firstToggle =
    await api.functional.discussionBoard.user.articles.favorites.toggle(
      userConnection,
      {
        articleId: article.id,
      },
    );
  typia.assert(firstToggle);
  TestValidator.equals(
    "first toggle should set favorited to true",
    firstToggle.favorited,
    true,
  );
  // Step 4: Second toggle (should set favorited=false)
  const secondToggle =
    await api.functional.discussionBoard.user.articles.favorites.toggle(
      userConnection,
      {
        articleId: article.id,
      },
    );
  typia.assert(secondToggle);
  TestValidator.equals(
    "second toggle should set favorited to false",
    secondToggle.favorited,
    false,
  );
  // Step 5: Third toggle (should set favorited=true again)
  const thirdToggle =
    await api.functional.discussionBoard.user.articles.favorites.toggle(
      userConnection,
      {
        articleId: article.id,
      },
    );
  typia.assert(thirdToggle);
  TestValidator.equals(
    "third toggle should set favorited back to true",
    thirdToggle.favorited,
    true,
  );
  // Step 6: Additional validations
  TestValidator.notEquals(
    "first and second toggle results must differ",
    firstToggle.favorited,
    secondToggle.favorited,
  );
  TestValidator.notEquals(
    "second and third toggle results must differ",
    secondToggle.favorited,
    thirdToggle.favorited,
  );
  TestValidator.equals(
    "first and third toggle results must match",
    firstToggle.favorited,
    thirdToggle.favorited,
  );
}
