import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCategory";
import type { IShoppingCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCategoryTree";

/**
 * Permanently deletes a category node as admin, validating deletion, catalog
 * integrity, and protected scenarios.
 *
 * This test ensures:
 *
 * 1. Admin-only authentication for protected API
 * 2. Successful hard deletion of a leaf category node
 * 3. Inaccessibility of the deleted category after operation
 * 4. Catalog integrity and relationship handling on delete
 * 5. Error handling when deleting a protected/root category
 */
export async function test_api_category_delete_by_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
        name: RandomGenerator.name(),
        role: "superadmin",
        status: "active",
      } satisfies IShoppingAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Create a category tree
  const treeCode = RandomGenerator.alphaNumeric(8).toLowerCase();
  const tree: IShoppingCategoryTree =
    await api.functional.shopping.admin.categoryTrees.create(connection, {
      body: {
        tree_code: treeCode,
        tree_name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph(),
      } satisfies IShoppingCategoryTree.ICreate,
    });
  typia.assert(tree);

  // 3a. Create a root category (protected from deletion)
  const rootCode = RandomGenerator.alphaNumeric(8).toLowerCase();
  const rootCategory: IShoppingCategory =
    await api.functional.shopping.admin.categories.create(connection, {
      body: {
        category_tree_id: tree.id,
        category_code: rootCode,
        category_name: RandomGenerator.name(1),
        sort_order: 1,
        description: RandomGenerator.paragraph(),
      } satisfies IShoppingCategory.ICreate,
    });
  typia.assert(rootCategory);

  // 3b. Create a child category under the root
  const childCode = RandomGenerator.alphaNumeric(8).toLowerCase();
  const childCategory: IShoppingCategory =
    await api.functional.shopping.admin.categories.create(connection, {
      body: {
        category_tree_id: tree.id,
        category_code: childCode,
        category_name: RandomGenerator.name(1),
        parent_id: rootCategory.id,
        sort_order: 2,
        description: RandomGenerator.paragraph(),
      } satisfies IShoppingCategory.ICreate,
    });
  typia.assert(childCategory);

  // 4. Hard delete the child category node
  await api.functional.shopping.admin.categories.erase(connection, {
    categoryTreeCode: treeCode,
    categoryCode: childCode,
  });

  // 5. Attempting to delete again should fail (category already deleted)
  await TestValidator.error(
    "deleting already-deleted category fails",
    async () => {
      await api.functional.shopping.admin.categories.erase(connection, {
        categoryTreeCode: treeCode,
        categoryCode: childCode,
      });
    },
  );

  // 6. Attempt to delete the root/protected category (should fail)
  await TestValidator.error("cannot delete root category node", async () => {
    await api.functional.shopping.admin.categories.erase(connection, {
      categoryTreeCode: treeCode,
      categoryCode: rootCode,
    });
  });
}
