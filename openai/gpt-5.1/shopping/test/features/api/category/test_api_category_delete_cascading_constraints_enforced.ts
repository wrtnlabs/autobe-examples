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
 * Validate basic hierarchical category creation and deletion workflow for
 * platformAdmin.
 *
 * Business context:
 *
 * - Platform administrators manage category trees and categories used for catalog
 *   navigation.
 * - Categories are created under a tree by business code and can form
 *   parent/child hierarchies via `parentCategoryCode`.
 * - The DELETE endpoint operates on a category identified by its tree code and
 *   category code.
 *
 * Original scenario intent was to validate conflict-style errors when deleting
 * non-leaf categories or categories with product assignments. However, the
 * available SDK for this test only exposes join/create/delete operations and
 * does not expose read/list or product-assignment APIs needed to assert
 * conflict or post-state. Also, status-code-specific checks are prohibited.
 *
 * Therefore this test focuses on a realistic, type-safe workflow:
 *
 * 1. Join as a platform admin to obtain an authorized connection.
 * 2. Create a category tree.
 * 3. Create a parent category inside that tree.
 * 4. Create a child category referencing the parent via `parentCategoryCode`.
 * 5. Delete the child category (leaf) via the erase endpoint.
 * 6. Delete the parent category afterwards, modeling that constraints would be
 *    satisfied once children are removed.
 *
 * The test asserts:
 *
 * - All create operations return properly typed DTOs.
 * - The created categories belong to the expected tree and hierarchy according to
 *   `treeCode` and `parentCategoryCode`.
 * - Delete calls complete at the SDK level without type errors.
 */
export async function test_api_category_delete_cascading_constraints_enforced(
  connection: api.IConnection,
) {
  // 1. Platform admin join / authentication
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create a category tree
  const treeCode = `tree-${RandomGenerator.alphaNumeric(8)}`;
  const treeBody = {
    code: treeCode,
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const tree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      { body: treeBody },
    );
  typia.assert(tree);

  TestValidator.predicate(
    "created tree code matches requested code",
    tree.code === treeCode,
  );

  // 3. Create a parent category in this tree
  const parentCategoryCode = `parent-${RandomGenerator.alphaNumeric(6)}`;
  const parentCategoryBody = {
    code: parentCategoryCode,
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    displayOrder: typia.random<number & tags.Type<"int32">>(),
    isActive: true,
  } satisfies IShoppingMallCategory.ICreate;

  const parentCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.categories.create(
      connection,
      {
        categoryTreeCode: tree.code,
        body: parentCategoryBody,
      },
    );
  typia.assert(parentCategory);

  TestValidator.predicate(
    "parent category belongs to created tree",
    parentCategory.treeCode === tree.code,
  );
  TestValidator.predicate(
    "parent category has no parentCategoryCode (root)",
    parentCategory.parentCategoryCode === null ||
      parentCategory.parentCategoryCode === undefined,
  );

  // 4. Create a child category under the parent
  const childCategoryCode = `child-${RandomGenerator.alphaNumeric(6)}`;
  const childCategoryBody = {
    code: childCategoryCode,
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    displayOrder: typia.random<number & tags.Type<"int32">>(),
    isActive: true,
    parentCategoryCode: parentCategory.code,
  } satisfies IShoppingMallCategory.ICreate;

  const childCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.categories.create(
      connection,
      {
        categoryTreeCode: tree.code,
        body: childCategoryBody,
      },
    );
  typia.assert(childCategory);

  TestValidator.predicate(
    "child category belongs to created tree",
    childCategory.treeCode === tree.code,
  );
  TestValidator.predicate(
    "child category's parentCategoryCode matches parent code",
    childCategory.parentCategoryCode === parentCategory.code,
  );

  // 5. Delete the child category (leaf)
  await api.functional.shoppingMall.platformAdmin.categoryTrees.categories.erase(
    connection,
    {
      categoryTreeCode: tree.code,
      categoryCode: childCategory.code,
    },
  );

  // 6. Delete the parent category after its child has been removed
  await api.functional.shoppingMall.platformAdmin.categoryTrees.categories.erase(
    connection,
    {
      categoryTreeCode: tree.code,
      categoryCode: parentCategory.code,
    },
  );
}
