import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

/**
 * Test hierarchical category creation where administrators create subcategories
 * with parent relationships. Validates that parent-child category hierarchies
 * work correctly, ensuring proper referential integrity and organizational
 * structure. The test verifies that nested categories maintain proper
 * relationships and display ordering within their parent context.
 */
export async function test_api_admin_category_creation_with_parent(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";

  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      first_name: RandomGenerator.paragraph({ sentences: 2 }),
      last_name: RandomGenerator.paragraph({ sentences: 2 }),
      role: "super_admin",
      permissions: JSON.stringify({ admin: true }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(adminAuth);

  // Step 2: Create parent category
  const parentCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1000>
        >(),
        active: true,
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(parentCategory);

  // Step 3: Create child category with parent reference
  const childCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1000>
        >(),
        active: true,
        parent_id: parentCategory.id,
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(childCategory);

  // Step 4: Validate parent-child relationship
  TestValidator.predicate(
    "child category should have parent reference",
    childCategory.parent !== undefined,
  );

  if (childCategory.parent) {
    TestValidator.equals(
      "child category parent ID should match created parent",
      childCategory.parent.id,
      parentCategory.id,
    );
    TestValidator.equals(
      "child category parent name should match",
      childCategory.parent.name,
      parentCategory.name,
    );
  }

  // Step 5: Verify organizational structure
  TestValidator.notEquals(
    "parent and child categories should have different IDs",
    parentCategory.id,
    childCategory.id,
  );
  TestValidator.predicate(
    "parent category should not have parent reference",
    parentCategory.parent === undefined,
  );

  // Step 6: Test display ordering
  TestValidator.predicate(
    "display order should be valid positive integer",
    parentCategory.display_order >= 0 && childCategory.display_order >= 0,
  );

  // Step 7: Verify category properties
  TestValidator.predicate(
    "parent category should be active",
    parentCategory.active === true,
  );
  TestValidator.predicate(
    "child category should be active",
    childCategory.active === true,
  );
  TestValidator.predicate(
    "parent category name should not be empty",
    parentCategory.name.length > 0,
  );
  TestValidator.predicate(
    "child category name should not be empty",
    childCategory.name.length > 0,
  );
  TestValidator.predicate(
    "parent category should have creation timestamp",
    parentCategory.created_at.length > 0,
  );
  TestValidator.predicate(
    "child category should have creation timestamp",
    childCategory.created_at.length > 0,
  );
}
