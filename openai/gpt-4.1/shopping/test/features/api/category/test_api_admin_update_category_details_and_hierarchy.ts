import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCategory";
import type { IShoppingCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCategoryTree";

/**
 * Validates admin capability to update a category's details and hierarchy
 * within a category tree.
 *
 * 1. Register a new admin for isolation and authentication
 * 2. Create a category tree
 * 3. Create two categories (catA: as initial root, catB: as another root)
 * 4. Update catB: change name, sort order, and assign catA as its parent
 * 5. Verify all updates reflected, including hierarchy
 * 6. Attempt to create a hierarchical cycle by updating catA's parent to catB and
 *    ensure it fails
 * 7. Attempt to update catB's name to duplicate a sibling's name and ensure it
 *    fails
 * 8. Ensure all successful updates are audit-trail consistent
 */
export async function test_api_admin_update_category_details_and_hierarchy(
  connection: api.IConnection,
) {
  // 1. Admin registration and authentication
  const adminEmail = RandomGenerator.name(1).toLowerCase() + "@shop-admin.com";
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
  // admin.token is automatically used by the SDK

  // 2. Create one category tree
  const catTreeCode = RandomGenerator.alphaNumeric(10).toLowerCase();
  const catTree: IShoppingCategoryTree =
    await api.functional.shopping.admin.categoryTrees.create(connection, {
      body: {
        tree_code: catTreeCode,
        tree_name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 8 }),
      } satisfies IShoppingCategoryTree.ICreate,
    });
  typia.assert(catTree);
  TestValidator.equals("tree_code matches", catTree.tree_code, catTreeCode);

  // 3. Create 2 root categories
  const catA_code = RandomGenerator.alphaNumeric(8).toLowerCase();
  const catB_code = RandomGenerator.alphaNumeric(8).toLowerCase();
  const catA: IShoppingCategory =
    await api.functional.shopping.admin.categoryTrees.categories.create(
      connection,
      {
        treeCode: catTree.tree_code,
        body: {
          category_tree_id: catTree.id,
          category_code: catA_code,
          category_name: RandomGenerator.name(2),
          sort_order: 1,
          parent_id: null,
          description: RandomGenerator.paragraph({ sentences: 6 }),
        } satisfies IShoppingCategory.ICreate,
      },
    );
  typia.assert(catA);
  const catB: IShoppingCategory =
    await api.functional.shopping.admin.categoryTrees.categories.create(
      connection,
      {
        treeCode: catTree.tree_code,
        body: {
          category_tree_id: catTree.id,
          category_code: catB_code,
          category_name: RandomGenerator.name(2),
          sort_order: 2,
          parent_id: null,
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IShoppingCategory.ICreate,
      },
    );
  typia.assert(catB);

  // 4. Update catB: change name, sort_order, and assign catA as parent
  const newNameB = RandomGenerator.paragraph({ sentences: 2 });
  const newDescB = RandomGenerator.paragraph({ sentences: 4 });
  const newSortB = 10;
  const updatedCatB: IShoppingCategory =
    await api.functional.shopping.admin.categoryTrees.categories.update(
      connection,
      {
        treeCode: catTree.tree_code,
        categoryCode: catB.category_code,
        body: {
          category_name: newNameB,
          sort_order: newSortB,
          description: newDescB,
          parent_id: catA.id,
        } satisfies IShoppingCategory.IUpdate,
      },
    );
  typia.assert(updatedCatB);
  TestValidator.equals(
    "category_name updated",
    updatedCatB.category_name,
    newNameB,
  );
  TestValidator.equals("sort_order updated", updatedCatB.sort_order, newSortB);
  TestValidator.equals("parent_id updated", updatedCatB.parent_id, catA.id);
  TestValidator.equals(
    "description updated",
    updatedCatB.description,
    newDescB,
  );
  TestValidator.equals(
    "category_tree_id stays the same",
    updatedCatB.category_tree_id,
    catTree.id,
  );

  // 5. Ensure audit trail consistency (updated_at is greater than created_at)
  TestValidator.predicate(
    "updated_at is after created_at",
    new Date(updatedCatB.updated_at).getTime() >=
      new Date(updatedCatB.created_at).getTime(),
  );

  // 6. Attempt to create cycle: set catA's parent to catB (should fail)
  await TestValidator.error(
    "category hierarchy cycle is prevented",
    async () => {
      await api.functional.shopping.admin.categoryTrees.categories.update(
        connection,
        {
          treeCode: catTree.tree_code,
          categoryCode: catA.category_code,
          body: {
            category_name: catA.category_name,
            sort_order: catA.sort_order,
            parent_id: catB.id,
          } satisfies IShoppingCategory.IUpdate,
        },
      );
    },
  );

  // 7. Attempt to update catB's name to duplicate catA's name under same parent (should fail)
  await TestValidator.error(
    "category_name uniqueness among siblings is enforced",
    async () => {
      await api.functional.shopping.admin.categoryTrees.categories.update(
        connection,
        {
          treeCode: catTree.tree_code,
          categoryCode: catB.category_code,
          body: {
            category_name: catA.category_name,
            sort_order: catB.sort_order,
            parent_id: catA.id,
          } satisfies IShoppingCategory.IUpdate,
        },
      );
    },
  );
}
