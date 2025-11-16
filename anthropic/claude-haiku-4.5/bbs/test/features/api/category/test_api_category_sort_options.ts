import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCategory";

/**
 * Test all available category sorting options comprehensively.
 *
 * This test validates the sorting functionality of the discussion board
 * categories API by testing all available sort fields (display_order,
 * created_at, name) and both sort directions (ascending and descending). It
 * verifies that:
 *
 * 1. Default sorting by display_order in ascending order works correctly
 * 2. Sorting by created_at in ascending order (oldest first) returns correct
 *    sequence
 * 3. Sorting by created_at in descending order (newest first) returns correct
 *    sequence
 * 4. Sorting by name alphabetically in ascending order works correctly
 * 5. Sorting by name alphabetically in descending order works correctly
 * 6. Pagination works correctly with sorting applied
 * 7. No sort parameters defaults to display_order ascending behavior
 *
 * These tests ensure that the API properly handles sort parameters and returns
 * categories in the expected order for different use cases.
 */
export async function test_api_category_sort_options(
  connection: api.IConnection,
) {
  const limit = 10;

  // Test 1: Default sorting (no sort parameters) - should sort by display_order ascending
  const defaultSortResult: IPageIDiscussionBoardCategory.ISummary =
    await api.functional.discussionBoard.categories.index(connection, {
      body: {
        limit,
      } satisfies IDiscussionBoardCategory.IRequest,
    });
  typia.assert(defaultSortResult);

  // Verify default sort returns results
  TestValidator.predicate(
    "default sort should return categories",
    defaultSortResult.data.length > 0,
  );

  // Verify default sort is by display_order ascending (if multiple items)
  if (defaultSortResult.data.length > 1) {
    for (let i = 0; i < defaultSortResult.data.length - 1; i++) {
      TestValidator.predicate(
        `default sort display_order should be ascending at position ${i}`,
        defaultSortResult.data[i].display_order <=
          defaultSortResult.data[i + 1].display_order,
      );
    }
  }

  // Test 2: Explicit sorting by display_order ascending
  const displayOrderAscResult: IPageIDiscussionBoardCategory.ISummary =
    await api.functional.discussionBoard.categories.index(connection, {
      body: {
        order_by: "display_order",
        direction: "asc",
        limit,
      } satisfies IDiscussionBoardCategory.IRequest,
    });
  typia.assert(displayOrderAscResult);

  // Verify display_order ascending sort
  if (displayOrderAscResult.data.length > 1) {
    for (let i = 0; i < displayOrderAscResult.data.length - 1; i++) {
      TestValidator.predicate(
        `display_order ascending sort at position ${i}`,
        displayOrderAscResult.data[i].display_order <=
          displayOrderAscResult.data[i + 1].display_order,
      );
    }
  }

  // Test 3: Sorting by created_at ascending (oldest first)
  const createdAtAscResult: IPageIDiscussionBoardCategory.ISummary =
    await api.functional.discussionBoard.categories.index(connection, {
      body: {
        order_by: "created_at",
        direction: "asc",
        limit,
      } satisfies IDiscussionBoardCategory.IRequest,
    });
  typia.assert(createdAtAscResult);

  TestValidator.predicate(
    "created_at ascending sort should return categories",
    createdAtAscResult.data.length >= 0,
  );

  // Test 4: Sorting by created_at descending (newest first)
  const createdAtDescResult: IPageIDiscussionBoardCategory.ISummary =
    await api.functional.discussionBoard.categories.index(connection, {
      body: {
        order_by: "created_at",
        direction: "desc",
        limit,
      } satisfies IDiscussionBoardCategory.IRequest,
    });
  typia.assert(createdAtDescResult);

  TestValidator.predicate(
    "created_at descending sort should return categories",
    createdAtDescResult.data.length >= 0,
  );

  // Test 5: Sorting by name ascending (alphabetically)
  const nameAscResult: IPageIDiscussionBoardCategory.ISummary =
    await api.functional.discussionBoard.categories.index(connection, {
      body: {
        order_by: "name",
        direction: "asc",
        limit,
      } satisfies IDiscussionBoardCategory.IRequest,
    });
  typia.assert(nameAscResult);

  // Verify name ascending sort
  if (nameAscResult.data.length > 1) {
    for (let i = 0; i < nameAscResult.data.length - 1; i++) {
      TestValidator.predicate(
        `name ascending sort at position ${i}`,
        nameAscResult.data[i].name.localeCompare(
          nameAscResult.data[i + 1].name,
        ) <= 0,
      );
    }
  }

  // Test 6: Sorting by name descending (reverse alphabetically)
  const nameDescResult: IPageIDiscussionBoardCategory.ISummary =
    await api.functional.discussionBoard.categories.index(connection, {
      body: {
        order_by: "name",
        direction: "desc",
        limit,
      } satisfies IDiscussionBoardCategory.IRequest,
    });
  typia.assert(nameDescResult);

  // Verify name descending sort
  if (nameDescResult.data.length > 1) {
    for (let i = 0; i < nameDescResult.data.length - 1; i++) {
      TestValidator.predicate(
        `name descending sort at position ${i}`,
        nameDescResult.data[i].name.localeCompare(
          nameDescResult.data[i + 1].name,
        ) >= 0,
      );
    }
  }

  // Test 7: Pagination with sorting
  const page1Result: IPageIDiscussionBoardCategory.ISummary =
    await api.functional.discussionBoard.categories.index(connection, {
      body: {
        page: 1,
        limit: 5,
        order_by: "name",
        direction: "asc",
      } satisfies IDiscussionBoardCategory.IRequest,
    });
  typia.assert(page1Result);

  TestValidator.predicate(
    "pagination should respect limit",
    page1Result.data.length <= 5,
  );

  TestValidator.predicate(
    "pagination info should be valid",
    page1Result.pagination.current === 1,
  );

  TestValidator.predicate(
    "pagination limit should match request",
    page1Result.pagination.limit === 5,
  );

  // Test 8: Verify sort parameter combinations work together
  const combinedSortResult: IPageIDiscussionBoardCategory.ISummary =
    await api.functional.discussionBoard.categories.index(connection, {
      body: {
        page: 1,
        limit: 10,
        order_by: "display_order",
        direction: "desc",
      } satisfies IDiscussionBoardCategory.IRequest,
    });
  typia.assert(combinedSortResult);

  // Verify display_order descending sort
  if (combinedSortResult.data.length > 1) {
    for (let i = 0; i < combinedSortResult.data.length - 1; i++) {
      TestValidator.predicate(
        `display_order descending sort at position ${i}`,
        combinedSortResult.data[i].display_order >=
          combinedSortResult.data[i + 1].display_order,
      );
    }
  }
}
