import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_articles_create } from "../../../generate/generate_random_discussion_board_admin_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

/**
 * Test that an administrator can check favorite status for an article they have not favorited previously.
 * 1. Create an administrator account using join endpoint.
 * 2. Create an article using administrator credentials.
 * 3. Do NOT mark the article as favorited.
 * 4. Call the favorite status check endpoint.
 * 5. Validate that the response returns false to indicate the article is not currently favorited.
 * 6. Ensure the system correctly identifies when no favorite relationship exists between the administrator and the article.
 */
export async function test_api_article_favorite_status_check_not_favorited(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as administrator using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // Step 2: Create an article to check favorite status for (without marking as favorite)
  const article = await generate_random_discussion_board_admin_articles_create(
    adminConnection,
    {},
  );
  typia.assert(article);
  // Step 3: Call the favorite status check endpoint
  const favoriteStatus: IDiscussionBoardArticleFavorite =
    await api.functional.discussionBoard.admin.articles.favorites.own(
      adminConnection,
      {
        articleId: article.id,
      },
    );
  typia.assert(favoriteStatus);
  // Step 4: Validate that the response returns false (not favorited)
  TestValidator.equals(
    "favorite status should be false for unfavorited article",
    favoriteStatus.favorited,
    false,
  );
}
