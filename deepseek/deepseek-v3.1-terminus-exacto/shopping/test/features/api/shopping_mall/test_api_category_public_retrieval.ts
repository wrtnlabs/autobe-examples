import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

/**
 * Test that product categories can be retrieved publicly without
 * authentication. Validates that category information including name,
 * description, display order, and hierarchical relationships is accessible to
 * all users. The test should verify that active categories return complete
 * information while ensuring proper error handling for non-existent
 * categories.
 */
export async function test_api_category_public_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";

  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      role: "support_admin",
      permissions: JSON.stringify({ access_level: "basic" }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(adminAuth);

  // Step 2: Create test category using authenticated admin connection
  const categoryData = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1000>
    >() satisfies number as number,
    active: true,
    parent_id: undefined,
  } satisfies IShoppingMallCategory.ICreate;

  const createdCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryData,
    });
  typia.assert(createdCategory);

  // Step 3: Test public category retrieval without authentication
  // Create unauthenticated connection by clearing headers
  const publicConnection: api.IConnection = { ...connection, headers: {} };

  const retrievedCategory = await api.functional.shoppingMall.categories.at(
    publicConnection,
    {
      categoryId: createdCategory.id,
    },
  );
  typia.assert(retrievedCategory);

  // Step 4: Validate retrieved category matches created category
  TestValidator.equals(
    "category ID should match",
    retrievedCategory.id,
    createdCategory.id,
  );
  TestValidator.equals(
    "category name should match",
    retrievedCategory.name,
    createdCategory.name,
  );
  TestValidator.equals(
    "category description should match",
    retrievedCategory.description,
    createdCategory.description,
  );
  TestValidator.equals(
    "category display order should match",
    retrievedCategory.display_order,
    createdCategory.display_order,
  );
  TestValidator.equals(
    "category active status should match",
    retrievedCategory.active,
    createdCategory.active,
  );
  TestValidator.equals(
    "category should not have parent",
    retrievedCategory.parent,
    undefined,
  );
  TestValidator.equals(
    "category should not be deleted",
    retrievedCategory.deleted_at,
    undefined,
  );

  // Step 5: Test error handling for non-existent category
  const nonExistentCategoryId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "should fail to retrieve non-existent category",
    async () => {
      await api.functional.shoppingMall.categories.at(publicConnection, {
        categoryId: nonExistentCategoryId,
      });
    },
  );
}
