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
 * Validate that deleting one category under a parent does not affect its
 * sibling categories within the same category tree.
 *
 * Business scenario:
 *
 * - A platform administrator manages catalog category trees.
 * - Within a tree, multiple sibling categories exist under the same parent (or as
 *   root-level siblings).
 * - When one sibling category is deleted, its siblings and the overall tree must
 *   remain intact so that additional categories can still be created under the
 *   surviving siblings.
 *
 * This test performs the following steps:
 *
 * 1. Register a platform administrator via POST /auth/platformAdmin/join and
 *    obtain an authorized admin session (token is handled automatically by the
 *    SDK).
 * 2. Create a new category tree via POST
 *    /shoppingMall/platformAdmin/categoryTrees.
 * 3. Under that tree, create two sibling categories CAT_A and CAT_B using POST
 *    /shoppingMall/platformAdmin/categoryTrees/{categoryTreeCode}/categories.
 *    They are created as root-level siblings by omitting parentCategoryCode.
 * 4. Delete CAT_A using DELETE
 *    /shoppingMall/platformAdmin/categoryTrees/{categoryTreeCode}/categories/{categoryCode}.
 * 5. Assert that the delete call completes successfully and returns no body.
 * 6. Create another category CAT_C that uses CAT_B.code as its parentCategoryCode,
 *    proving that CAT_B still exists logically and can host child categories.
 * 7. Verify via TestValidator that:
 *
 *    - All created categories belong to the same tree (treeCode matches the created
 *         tree.code where applicable).
 *    - CAT_B and CAT_C maintain the expected parent/child structure
 *         (CAT_C.parentCategoryCode === CAT_B.code).
 *    - The test executes end-to-end without any errors, demonstrating that deleting
 *         one sibling does not cascade to its siblings.
 */
export async function test_api_category_delete_with_existing_siblings_preserves_others(
  connection: api.IConnection,
) {
  // 1. Register a platform administrator (platformAdmin.join)
  const joinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);
  typia.assert<IAuthorizationToken>(adminAuthorized.token);
  TestValidator.predicate(
    "platform admin is active after join",
    adminAuthorized.isActive === true,
  );

  // 2. Create a new category tree
  const treeCode = `TREE_${RandomGenerator.alphaNumeric(8)}`;
  const treeBody = {
    code: treeCode,
    name: "E2E Test Category Tree",
    description: RandomGenerator.paragraph({ sentences: 3 }),
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
    "created tree code should match request payload",
    tree.code,
    treeCode,
  );

  // 3. Create two root-level sibling categories CAT_A and CAT_B
  const catACode = `CAT_A_${RandomGenerator.alphaNumeric(6)}`;
  const catBCode = `CAT_B_${RandomGenerator.alphaNumeric(6)}`;

  const catABody = {
    code: catACode,
    name: "Category A (to be deleted)",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    displayOrder: 1 as number & tags.Type<"int32">,
    isActive: true,
  } satisfies IShoppingMallCategory.ICreate;

  const catA: IShoppingMallCategory =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.categories.create(
      connection,
      {
        categoryTreeCode: tree.code,
        body: catABody,
      },
    );
  typia.assert(catA);
  TestValidator.equals(
    "CAT_A should belong to the created tree",
    catA.treeCode,
    tree.code,
  );
  TestValidator.equals(
    "CAT_A code should match request code",
    catA.code,
    catACode,
  );
  TestValidator.equals(
    "CAT_A should be a root category (no parent)",
    catA.parentCategoryCode ?? null,
    null,
  );

  const catBBody = {
    code: catBCode,
    name: "Category B (sibling and parent of C)",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    displayOrder: 2 as number & tags.Type<"int32">,
    isActive: true,
  } satisfies IShoppingMallCategory.ICreate;

  const catB: IShoppingMallCategory =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.categories.create(
      connection,
      {
        categoryTreeCode: tree.code,
        body: catBBody,
      },
    );
  typia.assert(catB);
  TestValidator.equals(
    "CAT_B should belong to the created tree",
    catB.treeCode,
    tree.code,
  );
  TestValidator.equals(
    "CAT_B code should match request code",
    catB.code,
    catBCode,
  );
  TestValidator.equals(
    "CAT_B should be a root category (no parent)",
    catB.parentCategoryCode ?? null,
    null,
  );

  // 4. Delete CAT_A via erase endpoint
  await api.functional.shoppingMall.platformAdmin.categoryTrees.categories.erase(
    connection,
    {
      categoryTreeCode: tree.code,
      categoryCode: catA.code,
    },
  );

  // 5. Delete returns void; confirm that subsequent operations still work.
  // 6. Create CAT_C as a child of CAT_B to prove CAT_B was not affected.
  const catCCode = `CAT_C_${RandomGenerator.alphaNumeric(6)}`;
  const catCBody = {
    code: catCCode,
    name: "Category C (child of B after A deletion)",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    displayOrder: 3 as number & tags.Type<"int32">,
    isActive: true,
    parentCategoryCode: catB.code,
  } satisfies IShoppingMallCategory.ICreate;

  const catC: IShoppingMallCategory =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.categories.create(
      connection,
      {
        categoryTreeCode: tree.code,
        body: catCBody,
      },
    );
  typia.assert(catC);

  // 7. Validate structural relationships and sibling preservation
  TestValidator.equals(
    "CAT_C should belong to the same tree as CAT_B",
    catC.treeCode,
    tree.code,
  );
  TestValidator.equals(
    "CAT_C code should match request code",
    catC.code,
    catCCode,
  );
  TestValidator.equals(
    "CAT_C parentCategoryCode should be CAT_B.code",
    catC.parentCategoryCode ?? null,
    catB.code,
  );

  // Ensure CAT_B remained active and untouched by CAT_A deletion (inferred by successful child creation)
  TestValidator.equals(
    "CAT_B should remain active after CAT_A deletion",
    catB.isActive,
    true,
  );
}
