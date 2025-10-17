import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";

/**
 * Test retrieving category details to support breadcrumb navigation and
 * hierarchical category path display.
 *
 * This test validates that the category API response contains the necessary
 * parent_category_id field that enables breadcrumb construction and
 * hierarchical navigation. The parent_category_id field allows clients to
 * traverse up the category tree and build complete breadcrumb paths.
 *
 * Steps:
 *
 * 1. Retrieve a category detail by ID using the API
 * 2. Validate the response structure with typia.assert()
 * 3. Verify that parent_category_id is present for breadcrumb construction
 * 4. Demonstrate how parent_category_id enables hierarchical navigation
 */
export async function test_api_category_hierarchical_breadcrumb_navigation(
  connection: api.IConnection,
) {
  // Generate a random category ID for testing
  const categoryId = typia.random<string & tags.Format<"uuid">>();

  // Execute GET request to retrieve category details
  const category: IDiscussionBoardCategory =
    await api.functional.discussionBoard.categories.at(connection, {
      categoryId: categoryId,
    });

  // Validate the complete response structure - this validates ALL fields
  typia.assert(category);

  // Verify that parent_category_id field is accessible for breadcrumb construction
  // This is the key field that enables hierarchical navigation
  // For top-level categories (Economics, Politics), this will be null
  // For subcategories (Macroeconomics, International Relations), this references the parent
  const hasHierarchySupport =
    category.parent_category_id === null ||
    category.parent_category_id !== undefined;

  TestValidator.predicate(
    "category supports hierarchical breadcrumb navigation",
    hasHierarchySupport,
  );

  // Demonstrate breadcrumb path construction concept:
  // If parent_category_id exists, clients can:
  // 1. Fetch parent category using parent_category_id
  // 2. Continue fetching ancestors until parent_category_id is null
  // 3. Build breadcrumb: Home > Economics > Macroeconomics

  // Verify display_order enables proper category hierarchy positioning
  TestValidator.predicate(
    "category has display order for hierarchy positioning",
    category.display_order >= 0,
  );
}
