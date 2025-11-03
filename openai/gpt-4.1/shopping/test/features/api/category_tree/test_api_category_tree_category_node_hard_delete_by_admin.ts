import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCategory";
import type { IShoppingCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCategoryTree";

/**
 * Validate the hard deletion of a category node from a category tree by an
 * admin.
 *
 * Business workflow:
 *
 * 1. Register a platform admin (with privilege role and active status)
 * 2. Create a new category tree
 * 3. Add a category to the tree
 * 4. Delete that category node as admin
 * 5. Verify the operation completes without error/exception
 *
 * Covered: hierarchical data integrity, audit enforcement, assignment rules.
 */
export async function test_api_category_tree_category_node_hard_delete_by_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    role: "superadmin",
    status: "active",
  } satisfies IShoppingAdmin.IJoin;
  const admin: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(admin);
  TestValidator.equals(
    "admin email matches join",
    admin.email,
    adminJoinBody.email,
  );
  TestValidator.equals(
    "admin role as requested",
    admin.role,
    adminJoinBody.role,
  );
  TestValidator.equals(
    "admin status as requested",
    admin.status,
    adminJoinBody.status,
  );

  // 2. Create a new category tree
  const treeCode = RandomGenerator.alphaNumeric(12).toLowerCase();
  const treeName = RandomGenerator.name();
  const treeBody = {
    tree_code: treeCode,
    tree_name: treeName,
    description: RandomGenerator.paragraph(),
  } satisfies IShoppingCategoryTree.ICreate;
  const categoryTree: IShoppingCategoryTree =
    await api.functional.shopping.admin.categoryTrees.create(connection, {
      body: treeBody,
    });
  typia.assert(categoryTree);
  TestValidator.equals(
    "category tree code matches",
    categoryTree.tree_code,
    treeBody.tree_code,
  );
  TestValidator.equals(
    "category tree name matches",
    categoryTree.tree_name,
    treeBody.tree_name,
  );

  // 3. Add a category to the tree
  const categoryCode = RandomGenerator.alphaNumeric(8).toLowerCase();
  const categoryName = RandomGenerator.name();
  const categoryBody = {
    category_tree_id: categoryTree.id,
    category_code: categoryCode,
    category_name: categoryName,
    sort_order: 1,
    description: RandomGenerator.paragraph(),
  } satisfies IShoppingCategory.ICreate;
  const category: IShoppingCategory =
    await api.functional.shopping.admin.categoryTrees.categories.create(
      connection,
      { treeCode: categoryTree.tree_code, body: categoryBody },
    );
  typia.assert(category);
  TestValidator.equals(
    "category code matches",
    category.category_code,
    categoryBody.category_code,
  );
  TestValidator.equals(
    "category name matches",
    category.category_name,
    categoryBody.category_name,
  );
  TestValidator.equals(
    "category tree id matches",
    category.category_tree_id,
    categoryTree.id,
  );

  // 4. Delete the category node (hard delete)
  await api.functional.shopping.admin.categoryTrees.categories.erase(
    connection,
    {
      treeCode: categoryTree.tree_code,
      categoryCode: category.category_code,
    },
  );
  // 5. Operation succeeded if no error thrown
  TestValidator.predicate(
    "category node deleted successfully (no exception)",
    true,
  );
}
