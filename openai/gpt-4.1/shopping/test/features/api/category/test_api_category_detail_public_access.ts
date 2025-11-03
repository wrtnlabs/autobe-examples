import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCategory";
import type { IShoppingCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCategoryTree";

/**
 * Validate that public users can retrieve full details of a category node
 * within a given category tree by specifying correct tree and category codes.
 *
 * This test performs:
 *
 * 1. Registers a new admin to obtain authentication for admin endpoints
 * 2. Creates a new category tree (taxonomy root) with a unique code
 * 3. Creates a category node in that tree for testing retrieval
 * 4. As a public (unauthenticated) user, queries the GET
 *    /shopping/categories/{categoryTreeCode}/{categoryCode} endpoint
 * 5. Confirms all returned fields match IShoppingCategory schema and the
 *    hierarchical relationship is correct
 * 6. Edge case: Attempts to get category details for a non-existent
 *    categoryTreeCode and/or categoryCode, validating error behavior
 * 7. Validates that authentication is not required for this endpoint
 */
export async function test_api_category_detail_public_access(
  connection: api.IConnection,
) {
  // 1. Register new admin (for authentication with admin endpoints)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
        name: RandomGenerator.name(),
        role: "super",
        status: "active",
      } satisfies IShoppingAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Create a new category tree
  const categoryTreeBody = {
    tree_code: RandomGenerator.alphaNumeric(8).toLowerCase(),
    tree_name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IShoppingCategoryTree.ICreate;
  const categoryTree: IShoppingCategoryTree =
    await api.functional.shopping.admin.categoryTrees.create(connection, {
      body: categoryTreeBody,
    });
  typia.assert(categoryTree);

  // 3. Create a new category node in the new tree
  const categoryCode = RandomGenerator.alphaNumeric(6).toLowerCase();
  const categoryName = RandomGenerator.paragraph({ sentences: 2 });
  const categoryBody = {
    category_tree_id: categoryTree.id,
    category_code: categoryCode,
    category_name: categoryName,
    sort_order: typia.random<number & tags.Type<"int32">>(),
    // no parent_id: root node
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IShoppingCategory.ICreate;
  const category: IShoppingCategory =
    await api.functional.shopping.admin.categories.create(connection, {
      body: categoryBody,
    });
  typia.assert(category);

  // 4. As public user, retrieve category details by tree_code and category_code
  // Create an unauthenticated connection
  const publicConnection: api.IConnection = { ...connection, headers: {} };
  const categoryPublic: IShoppingCategory =
    await api.functional.shopping.categories.at(publicConnection, {
      categoryTreeCode: categoryTree.tree_code,
      categoryCode: category.category_code,
    });
  typia.assert(categoryPublic);
  // Structure and key business value checks
  TestValidator.equals(
    "returned category id matches created category",
    categoryPublic.id,
    category.id,
  );
  TestValidator.equals(
    "returned tree id matches category tree",
    categoryPublic.category_tree_id,
    categoryTree.id,
  );
  TestValidator.equals(
    "category code matches",
    categoryPublic.category_code,
    categoryCode,
  );
  TestValidator.equals(
    "category name matches",
    categoryPublic.category_name,
    categoryName,
  );
  TestValidator.equals(
    "sort order matches",
    categoryPublic.sort_order,
    categoryBody.sort_order,
  );
  // Ensure root node: parent_id absent or null
  TestValidator.equals(
    "parent_id is null for root node",
    categoryPublic.parent_id,
    null,
  );

  // 5. Edge case: non-existent tree code
  await TestValidator.error(
    "should fail for non-existent category tree code",
    async () => {
      await api.functional.shopping.categories.at(publicConnection, {
        categoryTreeCode: RandomGenerator.alphaNumeric(12).toLowerCase(),
        categoryCode: categoryCode,
      });
    },
  );

  // 6. Edge case: non-existent category code in valid tree
  await TestValidator.error(
    "should fail for non-existent category code in valid tree",
    async () => {
      await api.functional.shopping.categories.at(publicConnection, {
        categoryTreeCode: categoryTree.tree_code,
        categoryCode: RandomGenerator.alphaNumeric(12).toLowerCase(),
      });
    },
  );

  // 7. Edge case: both tree and category code non-existent
  await TestValidator.error(
    "should fail for non-existent tree and category code",
    async () => {
      await api.functional.shopping.categories.at(publicConnection, {
        categoryTreeCode: RandomGenerator.alphaNumeric(10).toLowerCase(),
        categoryCode: RandomGenerator.alphaNumeric(10).toLowerCase(),
      });
    },
  );
}
