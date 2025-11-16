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
 * Validate that a platform admin can create a category tree and then create a
 * new category inside that tree, and that the created category reflects the
 * input and tree context.
 *
 * Business flow:
 *
 * 1. Register a new platform administrator using the join API. This both
 *    provisions the admin identity and sets the Authorization header on the
 *    connection via the SDK.
 * 2. As this authenticated admin, create an active category tree with a unique
 *    code.
 * 3. Within that tree, create a root-level category (no parent category code)
 *    using the category creation API.
 * 4. Validate that the created category is correctly linked to the tree and that
 *    key fields such as code, name, isActive, parentCategoryCode, displayOrder,
 *    createdAt, and updatedAt behave as expected.
 */
export async function test_api_category_creation_by_platform_admin(
  connection: api.IConnection,
) {
  // 1. Register a new platform administrator
  const joinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  TestValidator.predicate("platform admin should be active", admin.isActive);
  TestValidator.predicate(
    "platform admin token access should be non-empty string",
    () => admin.token.access.length > 0,
  );

  // 2. Create an active category tree
  const treeCode: string = `tree_${RandomGenerator.alphaNumeric(12)}`;
  const treeBody = {
    code: treeCode,
    name: RandomGenerator.name(3),
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

  TestValidator.equals(
    "created tree code should match request code",
    tree.code,
    treeBody.code,
  );
  TestValidator.equals(
    "created tree name should match request name",
    tree.name,
    treeBody.name,
  );
  TestValidator.equals(
    "created tree active flag should be true",
    tree.active,
    true,
  );
  TestValidator.equals(
    "created tree defaultLocale should match request",
    tree.defaultLocale,
    treeBody.defaultLocale,
  );

  // 3. Create a root-level category within that tree
  const categoryCode: string = `cat_${RandomGenerator.alphaNumeric(10)}`;
  const displayOrder: number & tags.Type<"int32"> = typia.random<
    number & tags.Type<"int32">
  >();

  const categoryBody = {
    code: categoryCode,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    displayOrder,
    isActive: true,
    // parentCategoryCode omitted => root-level
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.categories.create(
      connection,
      {
        categoryTreeCode: tree.code,
        body: categoryBody,
      },
    );
  typia.assert(category);

  // 4. Validate key fields on the created category
  TestValidator.equals(
    "category treeCode should match parent tree code",
    category.treeCode,
    tree.code,
  );
  TestValidator.equals(
    "category code should match request code",
    category.code,
    categoryBody.code,
  );
  TestValidator.equals(
    "category name should match request name",
    category.name,
    categoryBody.name,
  );
  TestValidator.equals(
    "category active flag should reflect input isActive",
    category.isActive,
    categoryBody.isActive,
  );
  TestValidator.equals(
    "category displayOrder should match request displayOrder",
    category.displayOrder,
    categoryBody.displayOrder,
  );
  TestValidator.equals(
    "root category parentCategoryCode should be null or undefined",
    category.parentCategoryCode ?? null,
    null,
  );

  // createdAt and updatedAt are validated structurally by typia.assert
  TestValidator.predicate(
    "category createdAt and updatedAt should be present",
    () =>
      typeof category.createdAt === "string" &&
      typeof category.updatedAt === "string",
  );
}
