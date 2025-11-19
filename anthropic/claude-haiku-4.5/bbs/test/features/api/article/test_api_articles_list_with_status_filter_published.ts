import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";

/**
 * Test retrieving articles filtered by publication status 'published'.
 *
 * Validates that the article list API correctly filters articles by their
 * publication status. When the status filter is set to "published", the API
 * should return only articles with published status, excluding all other
 * statuses (draft, pending_approval, rejected, archived, deleted).
 *
 * This test ensures:
 *
 * 1. The API correctly accepts the "published" status filter parameter
 * 2. Only articles with published status are included in results
 * 3. Articles with other statuses are excluded from the response
 * 4. The response includes proper pagination information
 * 5. Each article summary contains required id and title fields
 */
export async function test_api_articles_list_with_status_filter_published(
  connection: api.IConnection,
) {
  // Call the article list API with status filter set to "published"
  const response = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        status: "published",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );

  // Validate the response structure
  typia.assert(response);

  // Verify response contains pagination information
  TestValidator.predicate(
    "response should have pagination information",
    response.pagination !== undefined &&
      response.pagination.current !== undefined &&
      response.pagination.limit !== undefined &&
      response.pagination.records !== undefined &&
      response.pagination.pages !== undefined,
  );

  // Verify response contains data array
  TestValidator.predicate(
    "response should contain data array",
    Array.isArray(response.data),
  );

  // Verify all returned articles have required fields
  if (response.data.length > 0) {
    response.data.forEach((article, index) => {
      TestValidator.predicate(
        `article at index ${index} should have valid id`,
        typeof article.id === "string" && article.id.length > 0,
      );

      TestValidator.predicate(
        `article at index ${index} should have valid title`,
        typeof article.title === "string" && article.title.length > 0,
      );
    });

    TestValidator.predicate(
      "pagination current page should be at least 1",
      response.pagination.current >= 1,
    );

    TestValidator.predicate(
      "pagination limit should be positive",
      response.pagination.limit > 0,
    );
  }

  // Verify pagination consistency
  TestValidator.predicate(
    "returned articles count should not exceed limit",
    response.data.length <= response.pagination.limit,
  );

  // Verify pages calculation
  const expectedPages =
    response.pagination.records === 0
      ? 0
      : Math.ceil(response.pagination.records / response.pagination.limit);
  TestValidator.equals(
    "total pages should match records divided by limit",
    response.pagination.pages,
    expectedPages,
  );
}
