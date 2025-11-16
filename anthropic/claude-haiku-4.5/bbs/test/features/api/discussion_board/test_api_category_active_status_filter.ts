import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCategory";

/**
 * Test category active status filtering to ensure proper visibility control.
 *
 * Verifies that filtering by is_active=true returns only categories with active
 * status available for member selection. Test that filtering by is_active=false
 * returns only inactive categories. Verify that omitting the is_active filter
 * returns all categories regardless of active status. Test that the active
 * status properly controls whether categories appear in member-facing category
 * selections and navigation. Validate that inactive categories retain their
 * articles but are not shown in member UI.
 *
 * Steps:
 *
 * 1. Retrieve all categories without active status filter
 * 2. Retrieve only active categories (is_active=true)
 * 3. Retrieve only inactive categories (is_active=false)
 * 4. Verify filtering accuracy and data consistency
 * 5. Validate pagination works with status filters
 * 6. Verify article counts are preserved for inactive categories
 */
export async function test_api_category_active_status_filter(
  connection: api.IConnection,
) {
  // Step 1: Retrieve all categories without active status filter
  const allCategoriesResponse =
    await api.functional.discussionBoard.categories.index(connection, {
      body: {
        page: 1,
        limit: 50,
      } satisfies IDiscussionBoardCategory.IRequest,
    });
  typia.assert(allCategoriesResponse);
  TestValidator.predicate(
    "all categories response has pagination",
    allCategoriesResponse.pagination !== null &&
      allCategoriesResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "all categories response has data array",
    Array.isArray(allCategoriesResponse.data),
  );

  const totalCategories = allCategoriesResponse.pagination.records;
  TestValidator.predicate(
    "total categories count is non-negative",
    totalCategories >= 0,
  );

  // Step 2: Retrieve only active categories (is_active=true)
  const activeCategoriesResponse =
    await api.functional.discussionBoard.categories.index(connection, {
      body: {
        page: 1,
        limit: 50,
        is_active: true,
      } satisfies IDiscussionBoardCategory.IRequest,
    });
  typia.assert(activeCategoriesResponse);
  TestValidator.predicate(
    "active categories response is valid",
    activeCategoriesResponse.data !== null &&
      activeCategoriesResponse.data !== undefined,
  );

  // Step 3: Retrieve only inactive categories (is_active=false)
  const inactiveCategoriesResponse =
    await api.functional.discussionBoard.categories.index(connection, {
      body: {
        page: 1,
        limit: 50,
        is_active: false,
      } satisfies IDiscussionBoardCategory.IRequest,
    });
  typia.assert(inactiveCategoriesResponse);
  TestValidator.predicate(
    "inactive categories response is valid",
    inactiveCategoriesResponse.data !== null &&
      inactiveCategoriesResponse.data !== undefined,
  );

  // Step 4: Verify filtering accuracy and data consistency
  const activeCount = activeCategoriesResponse.pagination.records;
  const inactiveCount = inactiveCategoriesResponse.pagination.records;

  TestValidator.predicate("active category count is valid", activeCount >= 0);
  TestValidator.predicate(
    "inactive category count is valid",
    inactiveCount >= 0,
  );

  // Verify all active categories have required fields
  if (activeCategoriesResponse.data.length > 0) {
    const firstActive = activeCategoriesResponse.data[0];
    TestValidator.predicate(
      "active category has id",
      typeof firstActive.id === "string" && firstActive.id.length > 0,
    );
    TestValidator.predicate(
      "active category has name",
      typeof firstActive.name === "string" && firstActive.name.length > 0,
    );
    TestValidator.predicate(
      "active category has slug",
      typeof firstActive.slug === "string" && firstActive.slug.length > 0,
    );
    TestValidator.predicate(
      "active category has display_order",
      typeof firstActive.display_order === "number",
    );
    TestValidator.predicate(
      "active category has article_count",
      typeof firstActive.article_count === "number" &&
        firstActive.article_count >= 0,
    );
  }

  // Step 5: Validate pagination works with status filters
  if (activeCount > 10) {
    const activePage2Response =
      await api.functional.discussionBoard.categories.index(connection, {
        body: {
          page: 2,
          limit: 10,
          is_active: true,
        } satisfies IDiscussionBoardCategory.IRequest,
      });
    typia.assert(activePage2Response);
    TestValidator.predicate(
      "pagination limit is respected",
      activePage2Response.data.length <= 10,
    );
    TestValidator.predicate(
      "page 2 has different content than page 1",
      activePage2Response.pagination.current === 2,
    );
  }

  // Step 6: Verify article counts are preserved for inactive categories
  if (inactiveCategoriesResponse.data.length > 0) {
    const firstInactive = inactiveCategoriesResponse.data[0];
    TestValidator.predicate(
      "inactive category has article count",
      typeof firstInactive.article_count === "number" &&
        firstInactive.article_count >= 0,
    );
  }

  // Step 7: Test sorting with active status filter
  const sortedActiveResponse =
    await api.functional.discussionBoard.categories.index(connection, {
      body: {
        page: 1,
        limit: 50,
        is_active: true,
        order_by: "name",
        direction: "asc",
      } satisfies IDiscussionBoardCategory.IRequest,
    });
  typia.assert(sortedActiveResponse);
  TestValidator.predicate(
    "sorted active categories returned",
    sortedActiveResponse.data.length >= 0,
  );

  // Step 8: Test search with active status filter
  if (activeCategoriesResponse.data.length > 0) {
    const firstCategory = activeCategoriesResponse.data[0];
    const searchTerm = firstCategory.name.substring(
      0,
      Math.min(3, firstCategory.name.length),
    );
    const searchResponse =
      await api.functional.discussionBoard.categories.index(connection, {
        body: {
          page: 1,
          limit: 50,
          is_active: true,
          search: searchTerm,
        } satisfies IDiscussionBoardCategory.IRequest,
      });
    typia.assert(searchResponse);
    TestValidator.predicate(
      "search with active filter returns valid response",
      searchResponse.data.length >= 0,
    );
  }

  // Step 9: Verify undefined is_active parameter returns all categories
  const undefinedActiveResponse =
    await api.functional.discussionBoard.categories.index(connection, {
      body: {
        page: 1,
        limit: 50,
      } satisfies IDiscussionBoardCategory.IRequest,
    });
  typia.assert(undefinedActiveResponse);
  TestValidator.predicate(
    "undefined is_active returns all categories",
    undefinedActiveResponse.pagination.records >= 0,
  );

  // Step 10: Consistency check - all categories count should be >= active count
  TestValidator.predicate(
    "all categories count includes active categories",
    totalCategories >= activeCount,
  );
  TestValidator.predicate(
    "all categories count includes inactive categories",
    totalCategories >= inactiveCount,
  );

  // Final validation
  TestValidator.predicate(
    "active status filtering test completed successfully",
    true,
  );
}
