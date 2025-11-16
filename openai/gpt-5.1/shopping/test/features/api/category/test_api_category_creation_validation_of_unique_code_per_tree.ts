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
 * Validate uniqueness of category business code within a category tree.
 *
 * This test ensures that when a platform admin creates categories inside a
 * category tree, the combination (categoryTreeCode, category.code) is enforced
 * as unique by the backend:
 *
 * 1. Register a platform admin using /auth/platformAdmin/join so that subsequent
 *    shoppingMall platformAdmin endpoints are authorized.
 * 2. Create a first category tree with a deterministic business code (e.g.,
 *    "MAIN_TREE").
 * 3. In that tree, create a category with a specific business code (e.g.,
 *    "SHOES").
 * 4. Attempt to create a second category in the same tree using the same business
 *    code "SHOES" but with different name/description.
 * 5. Verify that the second creation fails (business validation error), without
 *    checking HTTP status code, only that an error is thrown.
 * 6. Create another category tree (e.g., "SECOND_TREE") and then create a category
 *    with code "SHOES" in that second tree; this should succeed, proving the
 *    uniqueness constraint is scoped per tree.
 * 7. Validate all successful responses with typia.assert and basic business
 *    invariants like treeCode and code equality.
 */
export async function test_api_category_creation_validation_of_unique_code_per_tree(
  connection: api.IConnection,
) {
  // 1. Register platform admin (join) so that the connection becomes
  //    authenticated for platformAdmin endpoints.
  const joinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create first category tree MAIN_TREE
  const mainTreeCode = "MAIN_TREE";
  const mainTreeBody = {
    code: mainTreeCode,
    name: "Main Category Tree",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const mainTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      { body: mainTreeBody },
    );
  typia.assert(mainTree);
  TestValidator.equals(
    "created main tree code should equal requested code",
    mainTree.code,
    mainTreeCode,
  );

  // 3. Create first category SHOES in MAIN_TREE
  const categoryCode = "SHOES";
  const firstCategoryBody = {
    code: categoryCode,
    name: "Shoes",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    displayOrder: 1 as number & tags.Type<"int32">,
    isActive: true,
  } satisfies IShoppingMallCategory.ICreate;

  const firstCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.categories.create(
      connection,
      {
        categoryTreeCode: mainTreeCode,
        body: firstCategoryBody,
      },
    );
  typia.assert(firstCategory);

  TestValidator.equals(
    "first category treeCode should match mainTreeCode",
    firstCategory.treeCode,
    mainTreeCode,
  );
  TestValidator.equals(
    "first category code should match requested categoryCode",
    firstCategory.code,
    categoryCode,
  );

  // 4. Attempt duplicate category with same code SHOES in MAIN_TREE.
  const duplicateCategoryBody = {
    code: categoryCode,
    name: "Shoes Duplicate",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    displayOrder: 2 as number & tags.Type<"int32">,
    isActive: true,
  } satisfies IShoppingMallCategory.ICreate;

  await TestValidator.error(
    "creating category with duplicate code in same tree should fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.categoryTrees.categories.create(
        connection,
        {
          categoryTreeCode: mainTreeCode,
          body: duplicateCategoryBody,
        },
      );
    },
  );

  // 5. Create a second category tree SECOND_TREE.
  const secondTreeCode = "SECOND_TREE";
  const secondTreeBody = {
    code: secondTreeCode,
    name: "Second Category Tree",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const secondTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      { body: secondTreeBody },
    );
  typia.assert(secondTree);
  TestValidator.equals(
    "created second tree code should equal requested code",
    secondTree.code,
    secondTreeCode,
  );

  // 6. Create category with same code SHOES in SECOND_TREE, which should
  //    succeed because uniqueness is scoped per tree.
  const secondTreeCategoryBody = {
    code: categoryCode,
    name: "Shoes in Second Tree",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    displayOrder: 1 as number & tags.Type<"int32">,
    isActive: true,
  } satisfies IShoppingMallCategory.ICreate;

  const secondTreeCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.categories.create(
      connection,
      {
        categoryTreeCode: secondTreeCode,
        body: secondTreeCategoryBody,
      },
    );
  typia.assert(secondTreeCategory);

  TestValidator.equals(
    "second tree category treeCode should match secondTreeCode",
    secondTreeCategory.treeCode,
    secondTreeCode,
  );
  TestValidator.equals(
    "second tree category code should still be shared business code",
    secondTreeCategory.code,
    categoryCode,
  );
}
