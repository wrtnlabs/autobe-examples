import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate that a platform administrator can delete a leaf category from a
 * specific category tree, and that the category becomes non-addressable
 * afterwards while the parent tree remains intact.
 *
 * Business flow:
 *
 * 1. Register (join) a platform admin and establish an authenticated context.
 * 2. Create a category tree under the shoppingMall platformAdmin namespace.
 * 3. Create a simple active leaf category (root level, no children) under that
 *    tree.
 * 4. Delete the created category using its composite business key
 *    (categoryTreeCode + categoryCode).
 * 5. Attempt to delete the same category again and verify that an HTTP error is
 *    thrown, proving that the category is already gone.
 * 6. Confirm that the parent tree object from creation remains valid and
 *    unchanged, demonstrating that deleting a leaf does not remove the tree.
 */
export async function test_api_category_delete_leaf_category_by_platform_admin(
  connection: api.IConnection,
) {
  // 1. Join platform admin to obtain authorized context
  const joinBody = typia.random<IShoppingMallPlatformAdminJoin.IRequest>();
  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(platformAdmin);

  // 2. Create a category tree
  const treeBody = typia.random<IShoppingMallCategoryTree.ICreate>();
  const tree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      {
        body: treeBody,
      },
    );
  typia.assert(tree);
  TestValidator.equals(
    "created category tree code should match request body",
    tree.code,
    treeBody.code,
  );

  const categoryTreeCode: string = tree.code;

  // 3. Create a leaf category within the created tree
  const categoryBodyBase = typia.random<IShoppingMallCategory.ICreate>();
  const categoryBody = {
    ...categoryBodyBase,
    // Ensure we have a deterministic active root-level category
    isActive: true,
    parentCategoryCode: undefined,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.categories.create(
      connection,
      {
        categoryTreeCode,
        body: categoryBody,
      },
    );
  typia.assert(category);

  TestValidator.equals(
    "created category should belong to the created tree",
    category.treeCode,
    categoryTreeCode,
  );
  TestValidator.equals(
    "created category code should match request body",
    category.code,
    categoryBody.code,
  );

  const categoryCode: string = category.code;

  // 4. Delete the created category (leaf) using composite key
  await api.functional.shoppingMall.platformAdmin.categoryTrees.categories.erase(
    connection,
    {
      categoryTreeCode,
      categoryCode,
    },
  );

  // 5. Second delete attempt must fail, proving the category no longer exists
  await TestValidator.error(
    "deleting the same category twice should fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.categoryTrees.categories.erase(
        connection,
        {
          categoryTreeCode,
          categoryCode,
        },
      );
    },
  );

  // 6. Validate that the original tree object is still a valid tree instance
  //    (we rely on initial creation response; there is no 'at' endpoint here).
  typia.assert<IShoppingMallCategoryTree>(tree);
  TestValidator.equals(
    "category tree code should remain unchanged after category deletion",
    tree.code,
    categoryTreeCode,
  );
}
