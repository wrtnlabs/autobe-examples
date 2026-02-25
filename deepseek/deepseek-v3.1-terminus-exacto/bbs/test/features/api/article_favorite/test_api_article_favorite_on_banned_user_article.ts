import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFavorite";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_favorite } from "../../../prepare/prepare_random_discussion_board_article_favorite";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { generate_random_discussion_board_user_articles_favorites_create } from "../../../generate/generate_random_discussion_board_user_articles_favorites_create";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_article_favorite_on_banned_user_article(
  connection: api.IConnection
): Promise<void> {
  // Create connections for two separate users
  const userAConnection: api.IConnection = { host: connection.host };
  const userBConnection: api.IConnection = { host: connection.host };

  // 1. Authenticate User A (article author)
  const userA = await authorize_user_join(userAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(userA);

  // 2. Authenticate User B (favoriting user)
  const userB = await authorize_user_join(userBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(userB);

  // 3. User A creates article
  const article = await generate_random_discussion_board_user_articles_create(userAConnection, {
    body: {
      title: RandomGenerator.paragraph({ sentences: 2 }),
      content: RandomGenerator.content({ paragraphs: 1, sentenceMin: 3, sentenceMax: 5 }),
      discussion_board_section_id: typia.random<string & tags.Format<"uuid">>(),
    } satisfies IDiscussionBoardArticle.ICreate,
  });
  typia.assert(article);

  // 4. User B favorites the article created by User A
  const favorite = await generate_random_discussion_board_user_articles_favorites_create(userBConnection, {
    params: {
      articleId: article.id,
    },
    body: {} satisfies IDiscussionBoardArticleFavorite.ICreate,
  });
  typia.assert(favorite);

  // 5. Validate that the favorite was created successfully
  TestValidator.equals("favorite status should be true", favorite.favorited, true);
}