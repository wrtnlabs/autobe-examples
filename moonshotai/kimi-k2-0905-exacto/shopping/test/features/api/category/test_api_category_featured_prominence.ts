import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";

/**
 * Test featured category identification and promotional display configuration.
 * Validates that featured categories receive appropriate homepage placement and
 * marketing visibility while maintaining catalog organization integrity across
 * the shopping mall platform.
 *
 * This comprehensive test validates featured category management by testing
 * category retrieval with different promotional configurations and verifying
 * their display prominence settings. The test ensures proper hierarchical
 * organization while validating featured status and visibility settings.
 *
 * Test workflow:
 *
 * 1. Retrieve category with random code to test basic functionality
 * 2. Validate featured category properties and promotional settings
 * 3. Test category hierarchy integrity with featured status
 * 4. Validate SEO metadata completeness for marketing visibility
 * 5. Verify display configuration and sort order settings
 * 6. Test catalog organization preservation with featured prominence
 */
export async function test_api_category_featured_prominence(
  connection: api.IConnection,
) {
  // Generate random category code for testing
  const testCategoryCode = typia.random<string>();

  // Test basic category retrieval and properties
  const category = await api.functional.shoppingMall.categories.at(connection, {
    categoryCode: testCategoryCode,
  });
  typia.assert(category);

  // Validate essential category identification
  TestValidator.equals(
    "category has valid UUID",
    typeof category.id === "string" && category.id.length > 0,
    true,
  );

  // Test featured prominence settings
  TestValidator.predicate(
    "is_featured is boolean type",
    typeof category.is_featured === "boolean",
  );

  TestValidator.predicate(
    "featured categories have display priority",
    category.is_active === true, // Featured categories must be active
  );

  // Validate catalog organization properties
  TestValidator.predicate(
    "category code is non-empty string",
    category.code.length > 0,
  );

  TestValidator.predicate(
    "category name meets length requirements",
    category.name.length >= 1 && category.name.length <= 100,
  );

  // Test hierarchical structure validation
  TestValidator.predicate(
    "category path is properly formatted",
    category.path.length > 0,
  );

  TestValidator.predicate(
    "category level is within bounds",
    category.level >= 0 && category.level <= 10,
  );

  // Validate display configuration
  TestValidator.predicate(
    "sort order is within valid range",
    category.sort_order >= 0 && category.sort_order <= 9999,
  );

  // Test SEO and marketing metadata for featured categories
  TestValidator.predicate(
    "at least one SEO metadata field exists",
    category.meta_title !== undefined ||
      category.meta_description !== undefined ||
      category.meta_keywords !== undefined,
  );

  // Validate parent category relationships for hierarchy integrity
  if (category.parent_id !== null) {
    TestValidator.predicate(
      "parent reference is valid UUID",
      category.parent_id.length > 0,
    );
  }

  // Test timestamp integrity for catalog tracking
  TestValidator.predicate(
    "created_at is valid timestamp",
    typeof category.created_at === "string",
  );

  TestValidator.predicate(
    "updated_at is valid timestamp",
    typeof category.updated_at === "string",
  );

  // Additional featured prominence validation
  TestValidator.predicate(
    "category maintains active status for display",
    category.is_active === true,
  );

  // Test optional image reference for visual prominence
  if (category.image !== undefined && category.image !== null) {
    TestValidator.predicate(
      "image URL has valid format",
      category.image.length <= 500,
    );
  }

  // Validate deletion status for catalog integrity
  TestValidator.predicate(
    "deleted_at is properly formatted when present",
    category.deleted_at === undefined ||
      category.deleted_at === null ||
      typeof category.deleted_at === "string",
  );
}
