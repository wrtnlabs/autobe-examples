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
 * Validate that a platform administrator can update mutable fields of an
 * existing category.
 *
 * Business goal: Ensure that a freshly joined platform admin can create a
 * category tree, create a category in that tree, then successfully update the
 * category's basic mutable fields (name, description, displayOrder, isActive)
 * via the dedicated update endpoint. Also verify that immutable identifiers and
 * structural fields are preserved.
 *
 * End-to-end workflow:
 *
 * 1. Join as a new platform admin using POST /auth/platformAdmin/join.
 *
 *    - This establishes the platformAdmin authorization context and sets
 *         Authorization header on the connection.
 * 2. Create a category tree using POST /shoppingMall/platformAdmin/categoryTrees.
 *
 *    - Provide a unique code, name, description, defaultLocale and active flag in
 *         IShoppingMallCategoryTree.ICreate.
 * 3. Create an initial category under that tree using POST
 *    /shoppingMall/platformAdmin/categoryTrees/{categoryTreeCode}/categories.
 *
 *    - Use IShoppingMallCategory.ICreate with initial values: code, name,
 *         description, displayOrder, isActive (true) and optionally
 *         parentCategoryCode omitted (root).
 * 4. Call PUT
 *    /shoppingMall/platformAdmin/categoryTrees/{categoryTreeCode}/categories/{categoryCode}
 *    through
 *    api.functional.shoppingMall.platformAdmin.categoryTrees.categories.update
 *    with an IShoppingMallCategory.IUpdate payload that:
 *
 *    - Changes name
 *    - Changes description
 *    - Changes displayOrder
 *    - Flips isActive from true to false.
 * 5. Assert via typia.assert that the response is a valid IShoppingMallCategory,
 *    and then validate business expectations with TestValidator:
 *
 *    - TreeCode remains equal to the original tree.code
 *    - Code remains equal to the original category.code
 *    - Id stays the same
 *    - Depth and isLeaf are unchanged
 *    - Name, description, displayOrder, isActive reflect the updated values
 *    - CreatedAt remains the same, updatedAt is not earlier than the previous
 *         updatedAt.
 * 6. (No negative token tests here; they can be covered in separate suites.)
 */
export async function test_api_category_update_by_platform_admin_basic_fields(
  connection: api.IConnection,
) {
  // 1. Join as a new platform admin
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Create a category tree
  const treeCreateBody = {
    code: `tree-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const tree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      { body: treeCreateBody },
    );
  typia.assert<IShoppingMallCategoryTree>(tree);

  // 3. Create an initial category under that tree
  const initialCategoryCreateBody = {
    code: `cat-${RandomGenerator.alphaNumeric(6)}`,
    name: "Initial Category",
    description: "Initial description",
    displayOrder: 1 as number & tags.Type<"int32">,
    isActive: true,
  } satisfies IShoppingMallCategory.ICreate;

  const createdCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.categories.create(
      connection,
      {
        categoryTreeCode: tree.code,
        body: initialCategoryCreateBody,
      },
    );
  typia.assert<IShoppingMallCategory>(createdCategory);

  // Snapshot immutable/structural fields before update
  const originalId = createdCategory.id;
  const originalTreeCode = createdCategory.treeCode;
  const originalCode = createdCategory.code;
  const originalDepth = createdCategory.depth;
  const originalIsLeaf = createdCategory.isLeaf;
  const originalCreatedAt = createdCategory.createdAt;
  const originalUpdatedAt = createdCategory.updatedAt;

  // 4. Prepare update payload to change basic mutable fields
  const updatedName = "Updated Category Name";
  const updatedDescription = "Updated category description";
  const updatedDisplayOrder: number & tags.Type<"int32"> = 5 as number &
    tags.Type<"int32">;
  const updatedIsActive = false;

  const updateBody = {
    name: updatedName,
    description: updatedDescription,
    displayOrder: updatedDisplayOrder,
    isActive: updatedIsActive,
  } satisfies IShoppingMallCategory.IUpdate;

  const updatedCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.categories.update(
      connection,
      {
        categoryTreeCode: tree.code,
        categoryCode: createdCategory.code,
        body: updateBody,
      },
    );
  typia.assert<IShoppingMallCategory>(updatedCategory);

  // 5. Business assertions
  // Immutable identifiers and structural fields
  TestValidator.equals(
    "treeCode should remain unchanged",
    updatedCategory.treeCode,
    originalTreeCode,
  );
  TestValidator.equals(
    "category code should remain unchanged",
    updatedCategory.code,
    originalCode,
  );
  TestValidator.equals(
    "id should remain unchanged",
    updatedCategory.id,
    originalId,
  );
  TestValidator.equals(
    "depth should remain unchanged",
    updatedCategory.depth,
    originalDepth,
  );
  TestValidator.equals(
    "isLeaf should remain unchanged",
    updatedCategory.isLeaf,
    originalIsLeaf,
  );

  // Updated mutable fields
  TestValidator.equals(
    "name should be updated",
    updatedCategory.name,
    updatedName,
  );
  TestValidator.equals(
    "description should be updated",
    updatedCategory.description,
    updatedDescription,
  );
  TestValidator.equals(
    "displayOrder should be updated",
    updatedCategory.displayOrder,
    updatedDisplayOrder,
  );
  TestValidator.equals(
    "isActive should be updated (toggled to false)",
    updatedCategory.isActive,
    updatedIsActive,
  );

  // Timestamps: createdAt should stay the same
  TestValidator.equals(
    "createdAt should remain unchanged after update",
    updatedCategory.createdAt,
    originalCreatedAt,
  );

  // updatedAt should be changed or at least not earlier than original
  TestValidator.predicate(
    "updatedAt should be greater than or equal to original updatedAt",
    new Date(updatedCategory.updatedAt).getTime() >=
      new Date(originalUpdatedAt).getTime(),
  );
}
