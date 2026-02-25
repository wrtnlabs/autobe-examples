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

export async function test_api_article_favorite_user_favorites_own_article(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create user-specific connection and register user
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user);
  // 2. Create article using the user connection
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {},
  );
  typia.assert(article);
  // 3. First toggle - should favorite (favorited: true)
  const firstToggle =
    await api.functional.discussionBoard.user.articles.favorites.toggle(
      userConnection,
      {
        articleId: article.id,
      },
    );
  typia.assert(firstToggle);
  TestValidator.equals(
    "first toggle should return favorited true",
    firstToggle.favorited,
    true,
  );
  // 4. Second toggle - should unfavorite (favorited: false)
  const secondToggle =
    await api.functional.discussionBoard.user.articles.favorites.toggle(
      userConnection,
      {
        articleId: article.id,
      },
    );
  typia.assert(secondToggle);
  TestValidator.equals(
    "second toggle should return favorited false",
    secondToggle.favorited,
    false,
  );
  // 5. Validate toggle functionality consistency
  TestValidator.notEquals(
    "favorite status should change after toggle",
    firstToggle.favorited,
    secondToggle.favorited,
  );
}
