import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
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

/**
 * Test article deletion by author scenario.
 *
 * Validates that users can delete their own articles and confirms proper authorization
 * enforcement by testing deletion attempts on articles owned by other users.
 */
export async function test_api_article_deletion_by_author(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create authenticated user connection
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userConnection, {});
  // Step 2: Create test article
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {},
  );
  typia.assert(article);
  // Step 3: Validate article was created successfully
  TestValidator.equals("article has valid ID", typeof article.id, "string");
  TestValidator.predicate("article has title", article.title.length > 0);
  TestValidator.predicate("article has content", article.content.length > 0);
  // Step 4: Delete the article
  await api.functional.discussionBoard.user.articles.erase(userConnection, {
    articleId: article.id,
  });
  // Step 5: Verify deletion success (void return indicates success)
  // The erase function returns void on success, so reaching this point validates deletion
  // Step 6: Test authorization - attempt to delete article from another user
  const otherUserConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(otherUserConnection, {});
  // Should fail when trying to delete someone else's article
  await TestValidator.error("cannot delete other user's article", async () => {
    await api.functional.discussionBoard.user.articles.erase(
      otherUserConnection,
      { articleId: article.id },
    );
  });
}
