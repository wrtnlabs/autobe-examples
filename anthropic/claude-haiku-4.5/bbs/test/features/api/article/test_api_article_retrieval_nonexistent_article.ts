import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function test_api_article_retrieval_nonexistent_article(
  connection: api.IConnection,
) {
  // Test 1: Valid UUID format but non-existent article ID
  // The API should return 404 error when trying to retrieve an article
  // that doesn't exist in the system
  await TestValidator.error(
    "non-existent article with valid UUID should return error",
    async () => {
      await api.functional.discussionBoard.articles.at(connection, {
        articleId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );

  // Test 2: Another random non-existent UUID
  // Validates that the API consistently handles missing articles
  await TestValidator.error(
    "different non-existent article ID should also return error",
    async () => {
      await api.functional.discussionBoard.articles.at(connection, {
        articleId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );

  // Test 3: Third random non-existent UUID
  // Ensures error handling is reliable across multiple requests
  await TestValidator.error(
    "multiple non-existent article requests should all return errors",
    async () => {
      await api.functional.discussionBoard.articles.at(connection, {
        articleId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
