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
 * Test attempt to delete a comment that does not exist (never created or already deleted).
 * 1. Authenticate as a user
 * 2. Create an article
 * 3. Attempt to delete a comment with random UUID
 * 4. Verify appropriate error handling for non-existent resources
 */
export async function test_api_comment_delete_nonexistent(
  connection: api.IConnection,
): Promise<void> {
  // 1. User authentication using utility function
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userConnection, {});
  // 2. Create an article using utility function
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {},
  );
  typia.assert(article);
  // 3. Attempt to delete a non-existent comment with random UUID
  await TestValidator.error("delete non-existent comment", async () => {
    await api.functional.discussionBoard.user.articles.comments.erase(
      userConnection,
      {
        articleId: article.id,
        commentId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });
}
