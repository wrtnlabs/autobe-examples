import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardAttachmentFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentFile";
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

export async function test_api_article_image_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test error handling when attempting to retrieve non-existent article images.
   * This test validates that the API properly handles cases where either the
   * article ID or image ID doesn't exist in the system.
   */
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  /**
   * Test Case 1: Non-existent article ID with valid image ID format
   * This should return a 404 error as the article doesn't exist
   */
  await TestValidator.error(
    "non-existent article should return error",
    async () => {
      await api.functional.discussionBoard.user.articles.images.at(
        userConnection,
        {
          articleId: typia.random<string & tags.Format<"uuid">>(),
          imageId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  /**
   * Test Case 2: Valid article ID format with non-existent image ID
   * This should return a 404 error as the specific image doesn't exist
   * (even if we had a valid article ID, the image ID is random)
   */
  await TestValidator.error(
    "non-existent image ID should return error",
    async () => {
      await api.functional.discussionBoard.user.articles.images.at(
        userConnection,
        {
          articleId: typia.random<string & tags.Format<"uuid">>(),
          imageId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
