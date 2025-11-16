import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

export async function test_api_category_creation_with_parent_category(
  connection: api.IConnection,
) {
  // 1. Join/register a platform admin to obtain authorized context
  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: typia.random<IShoppingMallPlatformAdminJoin.IRequest>(),
  });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Create a category tree that will own our categories
  const treeCode = `tree-${RandomGenerator.alphaNumeric(8)}`;
  const treeCreateBody = {
    code: treeCode,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const tree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      { body: treeCreateBody },
    );
  typia.assert<IShoppingMallCategoryTree>(tree);

  TestValidator.equals(
    "created tree code should match request code",
    tree.code,
    treeCreateBody.code,
  );
  TestValidator.equals(
    "created tree active flag should match request",
    tree.active,
    treeCreateBody.active ?? false,
  );

  // 3. Create a root category (no parentCategoryCode) under this tree
  const rootCategoryCode = `root-${RandomGenerator.alphaNumeric(8)}`;
  const rootCreateBody = {
    code: rootCategoryCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    displayOrder: 1,
    isActive: true,
  } satisfies IShoppingMallCategory.ICreate;

  const rootCategory =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.categories.create(
      connection,
      {
        categoryTreeCode: tree.code,
        body: rootCreateBody,
      },
    );
  typia.assert<IShoppingMallCategory>(rootCategory);

  TestValidator.equals(
    "root category treeCode should equal tree.code",
    rootCategory.treeCode,
    tree.code,
  );
  TestValidator.equals(
    "root category code should match requested code",
    rootCategory.code,
    rootCreateBody.code,
  );
  TestValidator.predicate(
    "root category should have no parentCategoryCode (null or undefined)",
    rootCategory.parentCategoryCode === null ||
      rootCategory.parentCategoryCode === undefined,
  );

  const rootDepth = rootCategory.depth;

  // 4. Create a child category under the root, specifying parentCategoryCode
  const childCategoryCode = `child-${RandomGenerator.alphaNumeric(8)}`;
  const childCreateBody = {
    code: childCategoryCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    displayOrder: 2,
    isActive: true,
    parentCategoryCode: rootCategory.code,
  } satisfies IShoppingMallCategory.ICreate;

  const childCategory =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.categories.create(
      connection,
      {
        categoryTreeCode: tree.code,
        body: childCreateBody,
      },
    );
  typia.assert<IShoppingMallCategory>(childCategory);

  // 5. Validate hierarchy semantics on the child category
  TestValidator.equals(
    "child category treeCode should equal tree.code",
    childCategory.treeCode,
    tree.code,
  );
  TestValidator.equals(
    "child category code should match requested code",
    childCategory.code,
    childCreateBody.code,
  );
  TestValidator.equals(
    "child parentCategoryCode should equal root category code",
    childCategory.parentCategoryCode,
    rootCategory.code,
  );
  TestValidator.predicate(
    "child category depth should be greater than root category depth",
    childCategory.depth > rootDepth,
  );
  TestValidator.predicate(
    "child category should be a leaf immediately after creation",
    childCategory.isLeaf === true,
  );
}
