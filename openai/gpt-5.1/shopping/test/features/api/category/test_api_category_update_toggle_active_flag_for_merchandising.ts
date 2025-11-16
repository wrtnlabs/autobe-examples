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
 * Verify that a platform administrator can safely deactivate and reactivate a
 * category by toggling the isActive flag, without affecting its hierarchy or
 * identifiers.
 *
 * Business workflow:
 *
 * 1. Register (join) a platform admin and obtain an authorized session.
 * 2. Create a category tree under that admin.
 * 3. Create a category in the tree with isActive = true.
 * 4. Update the category to set isActive = false via PUT.
 * 5. Assert that only the visibility flag changed (isActive) and structural
 *    identifiers/hierarchy remained identical, and updatedAt moved forward.
 * 6. Update again to set isActive = true.
 * 7. Assert that the category is active again, still with the same identifiers and
 *    hierarchy and a further advanced updatedAt.
 */
export async function test_api_category_update_toggle_active_flag_for_merchandising(
  connection: api.IConnection,
) {
  // 1. Join a platform admin (auth.platformAdmin.join)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://shoppingmall.test/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Create a category tree
  const treeBody = {
    code: `tree-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(2),
  } satisfies IShoppingMallCategoryTree.ICreate;

  const tree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      { body: treeBody },
    );
  typia.assert<IShoppingMallCategoryTree>(tree);

  // 3. Create a category under the tree, with isActive = true
  const categoryCreateBody = {
    code: `cat-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(2),
    isActive: true,
  } satisfies IShoppingMallCategory.ICreate;

  const originalCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.categories.create(
      connection,
      {
        categoryTreeCode: tree.code,
        body: categoryCreateBody,
      },
    );
  typia.assert<IShoppingMallCategory>(originalCategory);

  // 4. First update: toggle isActive to false
  const firstUpdateBody = {
    isActive: false,
  } satisfies IShoppingMallCategory.IUpdate;

  const deactivatedCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.categories.update(
      connection,
      {
        categoryTreeCode: originalCategory.treeCode,
        categoryCode: originalCategory.code,
        body: firstUpdateBody,
      },
    );
  typia.assert<IShoppingMallCategory>(deactivatedCategory);

  // 5. Assertions after deactivation
  TestValidator.equals(
    "category should be deactivated (isActive = false)",
    deactivatedCategory.isActive,
    false,
  );

  // Structural identity & hierarchy must remain unchanged
  TestValidator.equals(
    "id must remain unchanged after deactivation",
    deactivatedCategory.id,
    originalCategory.id,
  );
  TestValidator.equals(
    "treeCode must remain unchanged after deactivation",
    deactivatedCategory.treeCode,
    originalCategory.treeCode,
  );
  TestValidator.equals(
    "code must remain unchanged after deactivation",
    deactivatedCategory.code,
    originalCategory.code,
  );
  TestValidator.equals(
    "slug must remain unchanged after deactivation",
    deactivatedCategory.slug,
    originalCategory.slug,
  );
  TestValidator.equals(
    "depth must remain unchanged after deactivation",
    deactivatedCategory.depth,
    originalCategory.depth,
  );
  TestValidator.equals(
    "displayOrder must remain unchanged after deactivation",
    deactivatedCategory.displayOrder,
    originalCategory.displayOrder,
  );
  TestValidator.equals(
    "parentCategoryCode must remain unchanged after deactivation",
    deactivatedCategory.parentCategoryCode,
    originalCategory.parentCategoryCode,
  );
  TestValidator.equals(
    "isLeaf must remain unchanged after deactivation",
    deactivatedCategory.isLeaf,
    originalCategory.isLeaf,
  );

  // createdAt should not change
  TestValidator.equals(
    "createdAt must remain unchanged after deactivation",
    deactivatedCategory.createdAt,
    originalCategory.createdAt,
  );

  // deletedAt should remain the same (usually null/undefined)
  TestValidator.equals(
    "deletedAt must remain unchanged after deactivation",
    deactivatedCategory.deletedAt ?? null,
    originalCategory.deletedAt ?? null,
  );

  // updatedAt should move forward or at least not go backwards
  TestValidator.predicate(
    "updatedAt should be advanced or equal after deactivation",
    () => deactivatedCategory.updatedAt >= originalCategory.updatedAt,
  );

  // 6. Second update: toggle isActive back to true
  const secondUpdateBody = {
    isActive: true,
  } satisfies IShoppingMallCategory.IUpdate;

  const reactivatedCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.categories.update(
      connection,
      {
        categoryTreeCode: originalCategory.treeCode,
        categoryCode: originalCategory.code,
        body: secondUpdateBody,
      },
    );
  typia.assert<IShoppingMallCategory>(reactivatedCategory);

  // 7. Assertions after reactivation
  TestValidator.equals(
    "category should be reactivated (isActive = true)",
    reactivatedCategory.isActive,
    true,
  );

  // Structural identity & hierarchy must still remain unchanged from the original
  TestValidator.equals(
    "id must remain unchanged after reactivation",
    reactivatedCategory.id,
    originalCategory.id,
  );
  TestValidator.equals(
    "treeCode must remain unchanged after reactivation",
    reactivatedCategory.treeCode,
    originalCategory.treeCode,
  );
  TestValidator.equals(
    "code must remain unchanged after reactivation",
    reactivatedCategory.code,
    originalCategory.code,
  );
  TestValidator.equals(
    "slug must remain unchanged after reactivation",
    reactivatedCategory.slug,
    originalCategory.slug,
  );
  TestValidator.equals(
    "depth must remain unchanged after reactivation",
    reactivatedCategory.depth,
    originalCategory.depth,
  );
  TestValidator.equals(
    "displayOrder must remain unchanged after reactivation",
    reactivatedCategory.displayOrder,
    originalCategory.displayOrder,
  );
  TestValidator.equals(
    "parentCategoryCode must remain unchanged after reactivation",
    reactivatedCategory.parentCategoryCode,
    originalCategory.parentCategoryCode,
  );
  TestValidator.equals(
    "isLeaf must remain unchanged after reactivation",
    reactivatedCategory.isLeaf,
    originalCategory.isLeaf,
  );

  TestValidator.equals(
    "createdAt must remain unchanged after reactivation",
    reactivatedCategory.createdAt,
    originalCategory.createdAt,
  );

  TestValidator.equals(
    "deletedAt must remain unchanged after reactivation",
    reactivatedCategory.deletedAt ?? null,
    originalCategory.deletedAt ?? null,
  );

  // updatedAt should continue to move forward
  TestValidator.predicate(
    "updatedAt should be advanced or equal after reactivation",
    () => reactivatedCategory.updatedAt >= deactivatedCategory.updatedAt,
  );
}
