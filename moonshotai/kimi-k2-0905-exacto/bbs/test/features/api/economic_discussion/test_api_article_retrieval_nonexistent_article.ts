import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticle";
import type { IEconomicDiscussionCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategories";
import type { IEconomicDiscussionMembers } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMembers";
import type { IEconomicDiscussionModerators } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerators";

/**
 * Test retrieving an article that does not exist to validate proper error
 * handling.
 *
 * This test generates a random UUID that is guaranteed not to exist in the
 * system, attempts to retrieve an article with that ID, and validates that the
 * API properly handles the non-existent resource scenario by throwing an
 * appropriate error.
 *
 * The test ensures that:
 *
 * 1. Random UUID generation works properly
 * 2. The API correctly identifies non-existent article IDs
 * 3. Appropriate error handling occurs for invalid resource requests
 *
 * @param connection - API connection object
 */
export async function test_api_article_retrieval_nonexistent_article(
  connection: api.IConnection,
) {
  // Generate a random UUID that definitely doesn't exist in the system
  const nonExistentArticleId = typia.random<string & tags.Format<"uuid">>();

  // Attempt to retrieve the non-existent article and expect an error
  await TestValidator.error(
    "non-existent article retrieval should fail",
    async () => {
      await api.functional.economicDiscussion.articles.at(connection, {
        articleId: nonExistentArticleId,
      });
    },
  );
}
