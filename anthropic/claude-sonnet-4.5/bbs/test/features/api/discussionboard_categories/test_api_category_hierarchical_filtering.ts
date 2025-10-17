import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCategory";

/**
 * Test filtering categories by hierarchical relationships to distinguish
 * between top-level categories and subcategories.
 *
 * This test validates the discussion board's multi-level category organization
 * system by testing hierarchical filtering capabilities. It ensures that:
 *
 * 1. Top-level categories can be retrieved by filtering for null
 *    parent_category_id
 * 2. Subcategories can be retrieved by filtering for a specific parent category
 * 3. Hierarchical relationships are correctly represented in response data
 * 4. Display_order affects result ordering within each hierarchical level
 * 5. Nested category structures are navigable through successive filtered queries
 *
 * The test demonstrates the platform's category taxonomy that enables users to
 * navigate from broad topics (Economics, Politics) to specific subtopics
 * (Macroeconomics, International Relations).
 */
export async function test_api_category_hierarchical_filtering(
  connection: api.IConnection,
) {
  // Step 1: Execute PATCH request filtering for top-level categories (parent_category_id is null)
  const topLevelRequest = {
    page: 1,
    limit: 50,
    parent_category_id: null,
  } satisfies IDiscussionBoardCategory.IRequest;

  const topLevelResponse: IPageIDiscussionBoardCategory.ISummary =
    await api.functional.discussionBoard.categories.index(connection, {
      body: topLevelRequest,
    });
  typia.assert(topLevelResponse);

  // Step 2: Confirm response contains only root-level categories without parent references
  TestValidator.predicate(
    "top-level categories returned",
    topLevelResponse.data.length > 0,
  );

  for (const category of topLevelResponse.data) {
    TestValidator.equals(
      "top-level category has null parent_category_id",
      category.parent_category_id,
      null,
    );
  }

  // Step 3: Select a top-level category to test subcategory filtering
  const parentCategory = topLevelResponse.data[0];
  typia.assert(parentCategory);

  // Step 4: Execute second request filtering for subcategories under the parent category
  const subcategoryRequest = {
    page: 1,
    limit: 50,
    parent_category_id: parentCategory.id,
  } satisfies IDiscussionBoardCategory.IRequest;

  const subcategoryResponse: IPageIDiscussionBoardCategory.ISummary =
    await api.functional.discussionBoard.categories.index(connection, {
      body: subcategoryRequest,
    });
  typia.assert(subcategoryResponse);

  // Step 5: Verify response contains only child categories with matching parent_category_id
  for (const category of subcategoryResponse.data) {
    TestValidator.equals(
      "subcategory has correct parent_category_id",
      category.parent_category_id,
      parentCategory.id,
    );
  }

  // Step 6: Validate hierarchical relationships are correctly represented
  TestValidator.predicate(
    "parent category exists in top-level results",
    topLevelResponse.data.some((c) => c.id === parentCategory.id),
  );

  // Step 7: Confirm display_order affects result ordering within each hierarchical level
  const topLevelOrdered = [...topLevelResponse.data].sort(
    (a, b) => a.display_order - b.display_order,
  );

  for (let i = 0; i < topLevelResponse.data.length; i++) {
    TestValidator.equals(
      "top-level categories ordered by display_order",
      topLevelResponse.data[i].id,
      topLevelOrdered[i].id,
    );
  }

  if (subcategoryResponse.data.length > 0) {
    const subcategoryOrdered = [...subcategoryResponse.data].sort(
      (a, b) => a.display_order - b.display_order,
    );

    for (let i = 0; i < subcategoryResponse.data.length; i++) {
      TestValidator.equals(
        "subcategories ordered by display_order",
        subcategoryResponse.data[i].id,
        subcategoryOrdered[i].id,
      );
    }
  }

  // Step 8: Test that nested category structures are navigable through successive filtered queries
  // Verify we can navigate the hierarchy by querying all top-level categories
  const allTopLevelRequest = {
    page: 1,
    limit: 100,
    parent_category_id: null,
  } satisfies IDiscussionBoardCategory.IRequest;

  const allTopLevelResponse: IPageIDiscussionBoardCategory.ISummary =
    await api.functional.discussionBoard.categories.index(connection, {
      body: allTopLevelRequest,
    });
  typia.assert(allTopLevelResponse);

  // For each top-level category, verify we can successfully query its children
  for (const topCategory of allTopLevelResponse.data.slice(0, 3)) {
    const childRequest = {
      page: 1,
      limit: 50,
      parent_category_id: topCategory.id,
    } satisfies IDiscussionBoardCategory.IRequest;

    const childResponse: IPageIDiscussionBoardCategory.ISummary =
      await api.functional.discussionBoard.categories.index(connection, {
        body: childRequest,
      });
    typia.assert(childResponse);

    // All children should reference their parent
    for (const child of childResponse.data) {
      TestValidator.equals(
        "child category references correct parent",
        child.parent_category_id,
        topCategory.id,
      );
    }
  }
}
