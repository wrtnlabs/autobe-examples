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
 * Validate re-parenting of a category within the same category tree by a
 * platform admin.
 *
 * Business intent:
 *
 * - A platform administrator can reorganize the catalog by moving a child
 *   category from one parent to another, as long as the target parent belongs
 *   to the same category tree.
 * - The operation is performed via PUT
 *   /shoppingMall/platformAdmin/categoryTrees/{categoryTreeCode}/categories/{categoryCode}
 *   with an `IShoppingMallCategory.IUpdate` payload.
 *
 * Scenario steps:
 *
 * 1. Join as a new platform admin using POST /auth/platformAdmin/join to obtain an
 *    authenticated admin session.
 * 2. Create a new category tree using POST
 *    /shoppingMall/platformAdmin/categoryTrees with an
 *    `IShoppingMallCategoryTree.ICreate` body.
 * 3. Within that tree, create two root-level categories (PARENT_A and PARENT_B)
 *    using POST
 *    /shoppingMall/platformAdmin/categoryTrees/{categoryTreeCode}/categories
 *    with `IShoppingMallCategory.ICreate` bodies that omit
 *    `parentCategoryCode`.
 * 4. Create a CHILD category under PARENT_A by specifying `parentCategoryCode:
 *    parentA.code`.
 * 5. Call PUT
 *    /shoppingMall/platformAdmin/categoryTrees/{categoryTreeCode}/categories/{categoryCode}
 *    for CHILD with an `IShoppingMallCategory.IUpdate` body that sets
 *    `parentCategoryCode` to `parentB.code`.
 * 6. Validate that:
 *
 *    - The returned `IShoppingMallCategory` passes typia.assert.
 *    - `treeCode` stays equal to the original tree.code.
 *    - `code` stays equal to CHILD.code.
 *    - `parentCategoryCode` is updated from PARENT_A.code to PARENT_B.code.
 *    - `isLeaf` remains true (still a leaf after re-parenting).
 *    - `depth` remains a non-negative int32 value (we do not assert exact value).
 * 7. Negative case: attempt to re-parent CHILD to a non-existent parent code
 *    within the same tree (e.g., "NON_EXISTENT_PARENT") and ensure the update
 *    call fails with a business validation error, using TestValidator.error.
 */
export async function test_api_category_update_reparent_within_same_tree(
  connection: api.IConnection,
) {
  // 1. Join as platform admin to obtain authenticated session
  const joinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    name: RandomGenerator.name(),
    password: "StrongPassword!123",
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
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
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const tree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      {
        body: treeBody,
      },
    );
  typia.assert(tree);

  TestValidator.equals(
    "created tree code should match request code",
    tree.code,
    treeCode,
  );

  // 3. Create two root-level parent categories (no parentCategoryCode)
  const parentACode = `PARENT_A_${RandomGenerator.alphaNumeric(6)}`;
  const parentABody = {
    code: parentACode,
    name: "Parent Category A",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    displayOrder: 1 as number & tags.Type<"int32">,
    isActive: true,
  } satisfies IShoppingMallCategory.ICreate;

  const parentA: IShoppingMallCategory =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.categories.create(
      connection,
      {
        categoryTreeCode: tree.code,
        body: parentABody,
      },
    );
  typia.assert(parentA);

  TestValidator.equals(
    "parentA.treeCode should match tree.code",
    parentA.treeCode,
    tree.code,
  );
  TestValidator.equals(
    "parentA.code should match requested code",
    parentA.code,
    parentACode,
  );
  TestValidator.predicate(
    "parentA.depth should be non-negative",
    parentA.depth >= 0,
  );

  const parentBCode = `PARENT_B_${RandomGenerator.alphaNumeric(6)}`;
  const parentBBody = {
    code: parentBCode,
    name: "Parent Category B",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    displayOrder: 2 as number & tags.Type<"int32">,
    isActive: true,
  } satisfies IShoppingMallCategory.ICreate;

  const parentB: IShoppingMallCategory =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.categories.create(
      connection,
      {
        categoryTreeCode: tree.code,
        body: parentBBody,
      },
    );
  typia.assert(parentB);

  TestValidator.equals(
    "parentB.treeCode should match tree.code",
    parentB.treeCode,
    tree.code,
  );
  TestValidator.equals(
    "parentB.code should match requested code",
    parentB.code,
    parentBCode,
  );
  TestValidator.predicate(
    "parentB.depth should be non-negative",
    parentB.depth >= 0,
  );

  // 4. Create CHILD under parentA
  const childCode = `CHILD_${RandomGenerator.alphaNumeric(6)}`;
  const childBody = {
    code: childCode,
    name: "Child Category",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    displayOrder: 10 as number & tags.Type<"int32">,
    isActive: true,
    parentCategoryCode: parentA.code,
  } satisfies IShoppingMallCategory.ICreate;

  const childOriginal: IShoppingMallCategory =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.categories.create(
      connection,
      {
        categoryTreeCode: tree.code,
        body: childBody,
      },
    );
  typia.assert(childOriginal);

  TestValidator.equals(
    "child.treeCode should match tree.code",
    childOriginal.treeCode,
    tree.code,
  );
  TestValidator.equals(
    "child.code should match requested code",
    childOriginal.code,
    childCode,
  );
  TestValidator.equals(
    "child.parentCategoryCode should be parentA.code",
    childOriginal.parentCategoryCode,
    parentA.code,
  );
  TestValidator.predicate(
    "child.depth should be non-negative",
    childOriginal.depth >= 0,
  );

  const originalIsLeaf = childOriginal.isLeaf;

  // 5. Re-parent CHILD from parentA to parentB via update
  const reparentBody = {
    parentCategoryCode: parentB.code,
  } satisfies IShoppingMallCategory.IUpdate;

  const childReparented: IShoppingMallCategory =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.categories.update(
      connection,
      {
        categoryTreeCode: tree.code,
        categoryCode: childOriginal.code,
        body: reparentBody,
      },
    );
  typia.assert(childReparented);

  // 6. Validate invariants after re-parenting
  TestValidator.equals(
    "reparented child treeCode should remain unchanged",
    childReparented.treeCode,
    childOriginal.treeCode,
  );
  TestValidator.equals(
    "reparented child code should remain unchanged",
    childReparented.code,
    childOriginal.code,
  );
  TestValidator.equals(
    "reparented child parentCategoryCode should be parentB.code",
    childReparented.parentCategoryCode,
    parentB.code,
  );
  TestValidator.equals(
    "reparented child isLeaf should remain unchanged",
    childReparented.isLeaf,
    originalIsLeaf,
  );
  TestValidator.predicate(
    "reparented child depth should be non-negative",
    childReparented.depth >= 0,
  );

  // 7. Negative case: attempt to re-parent to a non-existent parent code
  const invalidParentCode = `NON_EXISTENT_${RandomGenerator.alphaNumeric(6)}`;
  const invalidReparentBody = {
    parentCategoryCode: invalidParentCode,
  } satisfies IShoppingMallCategory.IUpdate;

  await TestValidator.error(
    "re-parenting to a non-existent parentCategoryCode should fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.categoryTrees.categories.update(
        connection,
        {
          categoryTreeCode: tree.code,
          categoryCode: childOriginal.code,
          body: invalidReparentBody,
        },
      );
    },
  );
}
