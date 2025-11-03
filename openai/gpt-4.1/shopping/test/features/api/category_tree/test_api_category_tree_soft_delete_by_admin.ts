import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCategoryTree";

/**
 * Ensure that an admin can soft-delete (archive) a category tree by its unique
 * tree_code.
 *
 * Validates the following:
 *
 * 1. Admin is able to create a category tree with a unique tree_code.
 * 2. The erase (soft-delete) operation sets the deleted_at field on the category
 *    tree.
 * 3. After soft-delete, the returned category tree shows deleted_at set and
 *    matches the original except for timestamps and deleted_at.
 * 4. A second delete attempt on the same tree_code fails with an error.
 * 5. An attempt to delete a nonexistent tree_code fails as expected.
 *
 * Not implemented (due to API/DTO constraints):
 *
 * - Validation of categories under the tree, assignments to products, or audit
 *   log testing, as such APIs are not available in the provided surface.
 */
export async function test_api_category_tree_soft_delete_by_admin(
  connection: api.IConnection,
) {
  // 1. Register as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const joinBody = {
    email: adminEmail,
    password: adminPassword,
    name: RandomGenerator.name(),
    role: RandomGenerator.pick([
      "super",
      "operator",
      "compliance",
      "support",
    ] as const),
    status: "active",
  } satisfies IShoppingAdmin.IJoin;
  const admin: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: joinBody });
  typia.assert(admin);
  TestValidator.equals(
    "admin email matches input",
    admin.email,
    joinBody.email,
  );
  TestValidator.equals("admin role matches input", admin.role, joinBody.role);
  TestValidator.equals("admin status is active", admin.status, joinBody.status);

  // 2. Create a category tree
  const treeCode = RandomGenerator.alphaNumeric(8);
  const createTreeBody = {
    tree_code: treeCode,
    tree_name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IShoppingCategoryTree.ICreate;
  const createdTree: IShoppingCategoryTree =
    await api.functional.shopping.admin.categoryTrees.create(connection, {
      body: createTreeBody,
    });
  typia.assert(createdTree);
  TestValidator.equals(
    "category tree code matches input",
    createdTree.tree_code,
    createTreeBody.tree_code,
  );

  // 3. Soft-delete (archive) the category tree
  const softDeleted: IShoppingCategoryTree =
    await api.functional.shopping.admin.categoryTrees.erase(connection, {
      treeCode,
    });
  typia.assert(softDeleted);
  TestValidator.equals(
    "deleted category tree code matches original",
    softDeleted.tree_code,
    createdTree.tree_code,
  );
  TestValidator.predicate(
    "deleted_at is set after soft-delete",
    typeof softDeleted.deleted_at === "string" &&
      !!softDeleted.deleted_at &&
      softDeleted.deleted_at.length > 0,
  );

  // 4. Attempt to delete the already soft-deleted tree again (should fail)
  await TestValidator.error(
    "deleting already soft-deleted category tree should fail",
    async () => {
      await api.functional.shopping.admin.categoryTrees.erase(connection, {
        treeCode,
      });
    },
  );

  // 5. Attempt to delete a non-existent tree (should fail)
  const nonExistentCode = RandomGenerator.alphaNumeric(12);
  await TestValidator.error(
    "deleting non-existent category tree should fail",
    async () => {
      await api.functional.shopping.admin.categoryTrees.erase(connection, {
        treeCode: nonExistentCode,
      });
    },
  );
}
