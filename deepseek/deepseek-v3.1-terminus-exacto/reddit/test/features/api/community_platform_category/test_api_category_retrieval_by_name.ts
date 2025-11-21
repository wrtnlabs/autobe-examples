import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";

/**
 * Test successful retrieval of a specific category by its unique name
 * identifier.
 *
 * This test validates that categories can be accessed publicly without
 * authentication and that all category details are properly returned including
 * name, display name, description, visual properties, and administrative
 * metadata. The test verifies that the response includes complete category
 * information with proper formatting for display in user interfaces.
 */
export async function test_api_category_retrieval_by_name(
  connection: api.IConnection,
) {
  // Generate a realistic category name using typia.random with proper constraints
  const categoryName = typia.random<
    string & tags.MinLength<3> & tags.MaxLength<50>
  >();

  // Call the API to retrieve the category by name
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.categories.at(connection, {
      categoryName: categoryName,
    });

  // Perform comprehensive type validation using typia.assert
  // This single call validates ALL type aspects including formats, constraints, and nested objects
  typia.assert(category);

  // Validate that the returned category name matches the requested name
  TestValidator.equals(
    "category name matches request",
    category.name,
    categoryName,
  );

  // Validate that essential business properties are present (not type validation)
  TestValidator.predicate(
    "category has display name",
    category.display_name.length > 0,
  );
  TestValidator.predicate(
    "category has description",
    category.description.length > 0,
  );
  TestValidator.predicate(
    "category has valid sort order",
    category.sort_order >= 0,
  );

  // Validate that nested administrator information is present
  TestValidator.predicate(
    "category has created_by administrator",
    category.created_by.display_name.length > 0,
  );
}
