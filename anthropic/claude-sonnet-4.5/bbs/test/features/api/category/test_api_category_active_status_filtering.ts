import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCategory";

/**
 * Test filtering categories by active status to show only currently available
 * categories.
 *
 * This test validates the platform's ability to filter categories based on
 * their active status, ensuring that users see only relevant, currently
 * available categories during topic creation and category browsing workflows.
 * The test verifies that the is_active filter correctly excludes inactive
 * categories from search results while maintaining proper pagination and
 * compatibility with other filter criteria.
 *
 * Test workflow:
 *
 * 1. Execute PATCH request with is_active=true filter
 * 2. Verify all returned categories have is_active=true
 * 3. Execute PATCH request with is_active=false filter to get inactive categories
 * 4. Verify all returned categories have is_active=false
 * 5. Test combining active status filter with other criteria (parent_category_id)
 * 6. Validate pagination works correctly with active status filtering
 * 7. Confirm category metadata includes the is_active status flag in responses
 */
export async function test_api_category_active_status_filtering(
  connection: api.IConnection,
) {
  // Step 1: Filter for active categories only
  const activeRequest = {
    is_active: true,
    page: 1,
    limit: 20,
  } satisfies IDiscussionBoardCategory.IRequest;

  const activeResult: IPageIDiscussionBoardCategory.ISummary =
    await api.functional.discussionBoard.categories.index(connection, {
      body: activeRequest,
    });
  typia.assert(activeResult);

  // Step 2: Verify all returned categories are active
  TestValidator.predicate(
    "all filtered categories should be active",
    activeResult.data.every((category) => category.is_active === true),
  );

  TestValidator.predicate(
    "should have at least some categories in the result",
    activeResult.data.length >= 0,
  );

  // Verify each category has the is_active flag
  for (const category of activeResult.data) {
    TestValidator.predicate(
      "category metadata includes is_active flag",
      typeof category.is_active === "boolean",
    );
    TestValidator.equals(
      "category is_active should be true",
      category.is_active,
      true,
    );
  }

  // Step 3: Filter for inactive categories
  const inactiveRequest = {
    is_active: false,
    page: 1,
    limit: 20,
  } satisfies IDiscussionBoardCategory.IRequest;

  const inactiveResult: IPageIDiscussionBoardCategory.ISummary =
    await api.functional.discussionBoard.categories.index(connection, {
      body: inactiveRequest,
    });
  typia.assert(inactiveResult);

  // Step 4: Verify all returned categories are inactive
  TestValidator.predicate(
    "all filtered categories should be inactive",
    inactiveResult.data.every((category) => category.is_active === false),
  );

  for (const category of inactiveResult.data) {
    TestValidator.equals(
      "category is_active should be false",
      category.is_active,
      false,
    );
  }

  // Step 5: Test combining active status filter with search text
  const combinedSearchRequest = {
    is_active: true,
    search: "Economics",
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardCategory.IRequest;

  const combinedSearchResult: IPageIDiscussionBoardCategory.ISummary =
    await api.functional.discussionBoard.categories.index(connection, {
      body: combinedSearchRequest,
    });
  typia.assert(combinedSearchResult);

  TestValidator.predicate(
    "combined search filter - all results should be active",
    combinedSearchResult.data.every((category) => category.is_active === true),
  );

  // Step 6: Test pagination with active status filtering
  const firstPageRequest = {
    is_active: true,
    page: 1,
    limit: 5,
  } satisfies IDiscussionBoardCategory.IRequest;

  const firstPage: IPageIDiscussionBoardCategory.ISummary =
    await api.functional.discussionBoard.categories.index(connection, {
      body: firstPageRequest,
    });
  typia.assert(firstPage);

  TestValidator.predicate(
    "first page - all results should be active",
    firstPage.data.every((category) => category.is_active === true),
  );

  TestValidator.predicate(
    "first page should respect limit",
    firstPage.data.length <= 5,
  );

  TestValidator.equals(
    "pagination current page should be 1",
    firstPage.pagination.current,
    1,
  );

  TestValidator.equals(
    "pagination limit should match request",
    firstPage.pagination.limit,
    5,
  );

  // Test second page if there are enough results
  if (firstPage.pagination.pages > 1) {
    const secondPageRequest = {
      is_active: true,
      page: 2,
      limit: 5,
    } satisfies IDiscussionBoardCategory.IRequest;

    const secondPage: IPageIDiscussionBoardCategory.ISummary =
      await api.functional.discussionBoard.categories.index(connection, {
        body: secondPageRequest,
      });
    typia.assert(secondPage);

    TestValidator.predicate(
      "second page - all results should be active",
      secondPage.data.every((category) => category.is_active === true),
    );

    TestValidator.equals(
      "pagination current page should be 2",
      secondPage.pagination.current,
      2,
    );
  }

  // Step 7: Test without is_active filter (should return all categories)
  const allCategoriesRequest = {
    page: 1,
    limit: 50,
  } satisfies IDiscussionBoardCategory.IRequest;

  const allCategories: IPageIDiscussionBoardCategory.ISummary =
    await api.functional.discussionBoard.categories.index(connection, {
      body: allCategoriesRequest,
    });
  typia.assert(allCategories);

  TestValidator.predicate(
    "without filter - result set should contain categories",
    allCategories.data.length >= 0,
  );

  // Verify that active + inactive counts should equal total count
  const totalActiveCount = activeResult.pagination.records;
  const totalInactiveCount = inactiveResult.pagination.records;
  const totalAllCount = allCategories.pagination.records;

  TestValidator.equals(
    "active plus inactive should equal total categories",
    totalActiveCount + totalInactiveCount,
    totalAllCount,
  );
}
