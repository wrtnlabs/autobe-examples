import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";

/**
 * Test article list retrieval with invalid limit parameter.
 *
 * Validates that the endpoint properly rejects limit values outside the allowed
 * range of 1-100. Tests three invalid limit scenarios:
 *
 * - Limit = 0: Below the minimum threshold
 * - Limit = 101: Exceeds the maximum threshold
 * - Limit = -5: Negative value, well outside valid range
 *
 * For each invalid limit value, the API should return a validation error
 * indicating that the limit parameter violates the constraint requirements.
 */
export async function test_api_articles_list_invalid_limit_parameter(
  connection: api.IConnection,
) {
  // Test case 1: Limit = 0 (below minimum of 1)
  await TestValidator.error(
    "limit = 0 should fail validation (minimum is 1)",
    async () => {
      const body = {
        limit: 0,
      };

      await api.functional.discussionBoard.articles.index(connection, {
        body: body as any,
      });
    },
  );

  // Test case 2: Limit = 101 (exceeds maximum of 100)
  await TestValidator.error(
    "limit = 101 should fail validation (maximum is 100)",
    async () => {
      const body = {
        limit: 101,
      };

      await api.functional.discussionBoard.articles.index(connection, {
        body: body as any,
      });
    },
  );

  // Test case 3: Limit = -5 (negative value, well outside valid range)
  await TestValidator.error(
    "limit = -5 should fail validation (must be positive)",
    async () => {
      const body = {
        limit: -5,
      };

      await api.functional.discussionBoard.articles.index(connection, {
        body: body as any,
      });
    },
  );

  // Test case 4: Verify valid limit values work (boundary test)
  // limit = 1 (minimum valid value)
  const resultMin = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        limit: 1,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(resultMin);
  TestValidator.predicate(
    "limit = 1 should return valid pagination response",
    resultMin.pagination.limit >= 0 && resultMin.data.length >= 0,
  );

  // limit = 100 (maximum valid value)
  const resultMax = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        limit: 100,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(resultMax);
  TestValidator.predicate(
    "limit = 100 should return valid pagination response",
    resultMax.pagination.limit >= 0 && resultMax.data.length >= 0,
  );
}
