import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

export async function test_api_category_retrieval_inactive_category_visibility(
  connection: api.IConnection,
) {
  // 1. Register a platform admin to obtain an authorized admin session
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create an active category tree as the platform admin
  const treeCreateBody = {
    code: `tree-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const tree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      {
        body: treeCreateBody,
      },
    );
  typia.assert(tree);

  // 3. Create an initially active category within that tree
  const categoryCreateBody = {
    code: `cat-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 1 }),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    displayOrder: 1 as number & tags.Type<"int32">,
    isActive: true,
  } satisfies IShoppingMallCategory.ICreate;

  const createdCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.categories.create(
      connection,
      {
        categoryTreeCode: tree.code,
        body: categoryCreateBody,
      },
    );
  typia.assert(createdCategory);

  // Sanity checks on created category
  TestValidator.equals(
    "created category treeCode should equal parent tree.code",
    createdCategory.treeCode,
    tree.code,
  );
  TestValidator.equals(
    "created category code should equal requested code",
    createdCategory.code,
    categoryCreateBody.code,
  );
  TestValidator.equals(
    "created category should be active initially",
    createdCategory.isActive,
    true,
  );

  // 4. Update the category to set isActive=false via admin endpoint
  const categoryUpdateBody = {
    isActive: false,
  } satisfies IShoppingMallCategory.IUpdate;

  const updatedCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.categories.update(
      connection,
      {
        categoryTreeCode: tree.code,
        categoryCode: createdCategory.code,
        body: categoryUpdateBody,
      },
    );
  typia.assert(updatedCategory);

  TestValidator.equals(
    "updated category should now be inactive",
    updatedCategory.isActive,
    false,
  );
  TestValidator.equals(
    "updated category treeCode remains the same",
    updatedCategory.treeCode,
    createdCategory.treeCode,
  );
  TestValidator.equals(
    "updated category code remains the same",
    updatedCategory.code,
    createdCategory.code,
  );

  // 5. Call the public category detail endpoint as a guest (no Authorization header)
  const guestConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  const publicCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.categoryTrees.categories.at(
      guestConnection,
      {
        categoryTreeCode: tree.code,
        categoryCode: createdCategory.code,
      },
    );
  typia.assert(publicCategory);

  // 6. Validate that the public payload reflects the inactive state and identity consistency
  TestValidator.equals(
    "public category treeCode should equal tree.code",
    publicCategory.treeCode,
    tree.code,
  );
  TestValidator.equals(
    "public category code should equal created category code",
    publicCategory.code,
    createdCategory.code,
  );
  TestValidator.equals(
    "public category should expose isActive=false after deactivation",
    publicCategory.isActive,
    false,
  );
}
