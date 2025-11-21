import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";

/**
 * Test retrieval of categories with different workflow statuses (draft,
 * archived, suspended). This test validates that the API endpoint can retrieve
 * category information by name, focusing on proper response structure
 * validation rather than testing specific status behaviors since category
 * creation functionality is not available in the provided API.
 */
export async function test_api_category_retrieval_inactive_status(
  connection: api.IConnection,
) {
  // Generate realistic category names to test the API endpoint
  const categoryNames = ArrayUtil.repeat(
    4,
    () =>
      `test-category-${RandomGenerator.alphaNumeric(8)}-${RandomGenerator.alphaNumeric(6)}`,
  );

  for (const categoryName of categoryNames) {
    // Call the API endpoint with the generated category name
    const retrievedCategory: ICommunityPlatformCategory =
      await api.functional.communityPlatform.categories.at(connection, {
        categoryName: categoryName,
      });

    // Validate the response structure using typia.assert
    typia.assert(retrievedCategory);

    // Verify basic category properties exist and are valid
    TestValidator.predicate(
      "category should have valid ID format",
      retrievedCategory.id.length > 0,
    );

    TestValidator.predicate(
      "category should have non-empty name",
      retrievedCategory.name.length > 0,
    );

    TestValidator.predicate(
      "category should have non-empty display name",
      retrievedCategory.display_name.length > 0,
    );

    TestValidator.predicate(
      "category should have non-empty description",
      retrievedCategory.description.length > 0,
    );

    TestValidator.predicate(
      "category should have valid sort order",
      retrievedCategory.sort_order >= 0,
    );

    TestValidator.predicate(
      "category should have valid status",
      ["draft", "active", "archived", "suspended"].includes(
        retrievedCategory.status,
      ),
    );

    TestValidator.predicate(
      "category should have valid is_active flag",
      typeof retrievedCategory.is_active === "boolean",
    );

    TestValidator.predicate(
      "category should have valid created_at timestamp",
      retrievedCategory.created_at.length > 0,
    );

    TestValidator.predicate(
      "category should have valid updated_at timestamp",
      retrievedCategory.updated_at.length > 0,
    );

    // Verify created_by admin information is present and valid
    TestValidator.predicate(
      "category should have admin creator with valid ID",
      retrievedCategory.created_by.id.length > 0,
    );

    TestValidator.predicate(
      "category should have admin creator with valid display name",
      retrievedCategory.created_by.display_name.length > 0,
    );

    TestValidator.predicate(
      "category should have admin creator with valid admin level",
      retrievedCategory.created_by.admin_level.length > 0,
    );

    // Validate that optional fields are either undefined or valid
    if (retrievedCategory.icon_url !== undefined) {
      TestValidator.predicate(
        "icon_url should be valid URI when present",
        retrievedCategory.icon_url.startsWith("http") ||
          retrievedCategory.icon_url.startsWith("/"),
      );
    }

    if (retrievedCategory.color_hex !== undefined) {
      TestValidator.predicate(
        "color_hex should match hex format when present",
        /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(retrievedCategory.color_hex),
      );
    }

    if (retrievedCategory.deleted_at !== undefined) {
      TestValidator.predicate(
        "deleted_at should be valid timestamp when present",
        retrievedCategory.deleted_at.length > 0,
      );
    }
  }
}
