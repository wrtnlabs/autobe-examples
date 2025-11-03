import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCategory";

/**
 * Test that category retrieval returns comprehensive metadata for each
 * category.
 *
 * This test validates that the GET /discussionBoard/categories endpoint returns
 * a complete list of discussion board categories with all required metadata.
 * Each category should include a unique identifier (UUID), human-readable name,
 * optional description, display order for UI ordering, and active status
 * indicating whether the category is available for new article creation.
 *
 * The test verifies:
 *
 * 1. API call succeeds and returns a properly structured paginated response
 * 2. Response contains pagination metadata with valid values
 * 3. Data array contains category objects with all required fields
 * 4. Each category has complete metadata:
 *
 *    - Id: Valid UUID
 *    - Code: Unique category code identifier
 *    - Name: Human-readable category name
 *    - Description: Optional detailed description
 *    - DisplayOrder: Numeric ordering for UI presentation
 *    - IsActive: Boolean flag for availability status
 *    - CreatedAt: ISO 8601 date-time (validated by typia.assert)
 *    - UpdatedAt: ISO 8601 date-time (validated by typia.assert)
 *    - DeletedAt: Optional ISO 8601 soft-delete timestamp
 * 5. Pagination information is valid and consistent
 * 6. Categories are properly configured for UI filtering and article
 *    classification workflows
 */
export async function test_api_category_retrieval_complete_metadata(
  connection: api.IConnection,
) {
  // Retrieve all available discussion board categories
  const response: IPageIDiscussionBoardCategory =
    await api.functional.discussionBoard.categories.index(connection);
  typia.assert(response); // Performs COMPLETE validation of all types, formats, and constraints

  const { pagination, data: categories } = response;

  // Validate pagination is logically consistent
  TestValidator.predicate(
    "pagination total pages should equal ceiling of records divided by limit",
    pagination.limit === 0 ||
      pagination.pages === Math.ceil(pagination.records / pagination.limit),
  );

  // Validate current page is within valid range
  TestValidator.predicate(
    "current page should be within valid pagination range",
    pagination.current < pagination.pages || pagination.records === 0,
  );

  // If there are categories, validate business logic
  if (categories.length > 0) {
    // Validate that category codes are unique (business rule: codes must be unique)
    const codes = categories.map((cat) => cat.code);
    const uniqueCodes = new Set(codes);
    TestValidator.equals(
      "all category codes should be unique across categories",
      codes.length,
      uniqueCodes.size,
    );

    // Validate that at least some categories are active for new article creation
    const activeCategories = categories.filter((cat) => cat.isActive);
    TestValidator.predicate(
      "at least one category should be active for new article creation",
      activeCategories.length > 0,
    );

    // Validate display order provides meaningful ordering
    const displayOrders = categories.map((cat) => cat.displayOrder);
    const minOrder = Math.min(...displayOrders);
    const maxOrder = Math.max(...displayOrders);
    TestValidator.predicate(
      "display orders should span a meaningful range for UI ordering",
      maxOrder > minOrder,
    );

    // Sample and validate individual category structure (spot check)
    const sampleCategory = categories[0];
    TestValidator.predicate(
      "sample category should have non-empty code for classification",
      sampleCategory.code.length > 0,
    );

    TestValidator.predicate(
      "sample category should have non-empty name for UI display",
      sampleCategory.name.length > 0,
    );

    // Validate categories are suitable for filtering workflows
    TestValidator.predicate(
      "categories should have consistent timestamps indicating system management",
      new Date(sampleCategory.createdAt) <= new Date(sampleCategory.updatedAt),
    );
  }

  // Validate response structure is suitable for UI and filtering workflows
  TestValidator.predicate(
    "categories response should be properly structured for filtering workflows",
    response.pagination !== null &&
      response.data !== null &&
      Array.isArray(response.data),
  );
}
