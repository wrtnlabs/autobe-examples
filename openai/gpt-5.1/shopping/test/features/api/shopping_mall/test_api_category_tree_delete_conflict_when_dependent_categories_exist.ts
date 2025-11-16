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
 * Validate that deleting a category tree fails with a business error when there
 * are dependent categories under that tree, while using a properly
 * authenticated platform admin session.
 *
 * Business workflow:
 *
 * 1. Join as a new platform admin to obtain an authorized session on the shared
 *    connection.
 * 2. Create a new category tree with a unique business code.
 * 3. Create at least one category in that tree.
 * 4. Attempt to delete the category tree; expect an error because dependent
 *    categories exist.
 * 5. Optionally, verify that the tree is still usable by creating another category
 *    under the same tree code.
 */
export async function test_api_category_tree_delete_conflict_when_dependent_categories_exist(
  connection: api.IConnection,
) {
  // 1. Join as platform admin to authenticate the connection
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Create a new category tree with a unique code
  const categoryTreeCode: string = RandomGenerator.alphaNumeric(12);
  const treeCreateBody = {
    code: categoryTreeCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const tree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      { body: treeCreateBody },
    );
  typia.assert<IShoppingMallCategoryTree>(tree);
  TestValidator.equals(
    "created tree code should match requested code",
    tree.code,
    categoryTreeCode,
  );

  // 3. Create at least one category under the new tree
  const categoryCode: string = RandomGenerator.alphaNumeric(10);
  const categoryCreateBody = {
    code: categoryCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    displayOrder: 1 as number & tags.Type<"int32">,
    isActive: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.categories.create(
      connection,
      {
        categoryTreeCode: tree.code,
        body: categoryCreateBody,
      },
    );
  typia.assert<IShoppingMallCategory>(category);
  TestValidator.equals(
    "created category treeCode should match tree.code",
    category.treeCode,
    tree.code,
  );
  TestValidator.equals(
    "created category code should match requested code",
    category.code,
    categoryCode,
  );

  // 4. Attempt to delete the category tree; expect a business error
  await TestValidator.error(
    "deleting a tree with dependent categories should fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.categoryTrees.erase(
        connection,
        {
          categoryTreeCode: tree.code,
        },
      );
    },
  );

  // 5. Verify the tree is still usable by creating another category
  const anotherCategoryCode: string = RandomGenerator.alphaNumeric(10);
  const anotherCategoryCreateBody = {
    code: anotherCategoryCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    displayOrder: 2 as number & tags.Type<"int32">,
    isActive: true,
  } satisfies IShoppingMallCategory.ICreate;

  const anotherCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.categories.create(
      connection,
      {
        categoryTreeCode: tree.code,
        body: anotherCategoryCreateBody,
      },
    );
  typia.assert<IShoppingMallCategory>(anotherCategory);
  TestValidator.equals(
    "second category treeCode should still match tree.code after failed delete",
    anotherCategory.treeCode,
    tree.code,
  );
}
