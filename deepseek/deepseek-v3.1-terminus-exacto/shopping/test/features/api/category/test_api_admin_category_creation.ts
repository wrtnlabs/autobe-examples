import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

/**
 * Test that administrators can create new product categories with proper
 * hierarchical organization.
 *
 * Validates category creation workflow including unique name validation,
 * display order assignment, parent-child relationship establishment, and proper
 * timestamp generation. The test verifies that categories are created with
 * correct metadata and can be immediately used for product organization.
 */
export async function test_api_admin_category_creation(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";

  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      first_name: RandomGenerator.name(),
      last_name: RandomGenerator.name(),
      role: "support_admin",
      permissions: JSON.stringify({ can_manage_categories: true }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(adminAuth);

  // Step 2: Create a top-level category
  const topLevelCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 3,
          wordMax: 8,
        }),
        description: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<0>
        >(),
        active: true,
        parent_id: undefined,
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(topLevelCategory);

  // Validate top-level category properties
  TestValidator.equals(
    "top-level category should have no parent",
    topLevelCategory.parent,
    undefined,
  );
  TestValidator.predicate(
    "top-level category should be active",
    topLevelCategory.active,
  );
  TestValidator.equals(
    "display order should be positive",
    topLevelCategory.display_order >= 0,
    true,
  );

  // Step 3: Create a subcategory with parent relationship
  const subCategory = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 6,
        }),
        description: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 3,
          sentenceMax: 7,
        }),
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<0>
        >(),
        active: true,
        parent_id: topLevelCategory.id,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(subCategory);

  // Validate subcategory properties and parent relationship
  TestValidator.predicate("subcategory should be active", subCategory.active);

  // Safe parent relationship validation
  if (subCategory.parent !== undefined) {
    TestValidator.equals(
      "subcategory should reference parent",
      subCategory.parent.id,
      topLevelCategory.id,
    );
    TestValidator.equals(
      "parent category name should match",
      subCategory.parent.name,
      topLevelCategory.name,
    );
  } else {
    throw new Error("Subcategory should have a parent reference");
  }

  // Step 4: Create an inactive category for testing status functionality
  const inactiveCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 4,
          wordMax: 7,
        }),
        description: undefined, // Testing optional description
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<0>
        >(),
        active: false,
        parent_id: undefined,
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(inactiveCategory);

  // Validate inactive category properties
  TestValidator.predicate(
    "inactive category should not be active",
    !inactiveCategory.active,
  );
  TestValidator.equals(
    "inactive category should have no description",
    inactiveCategory.description,
    undefined,
  );

  // Step 5: Verify timestamp generation
  TestValidator.predicate(
    "categories should have creation timestamps",
    topLevelCategory.created_at !== undefined &&
      subCategory.created_at !== undefined &&
      inactiveCategory.created_at !== undefined,
  );

  TestValidator.predicate(
    "categories should have update timestamps",
    topLevelCategory.updated_at !== undefined &&
      subCategory.updated_at !== undefined &&
      inactiveCategory.updated_at !== undefined,
  );

  // Step 6: Test category uniqueness validation error
  await TestValidator.error("duplicate category name should fail", async () => {
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name: topLevelCategory.name, // Same name as existing category
        description: "Duplicate category test",
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<0>
        >(),
        active: true,
        parent_id: undefined,
      } satisfies IShoppingMallCategory.ICreate,
    });
  });
}
