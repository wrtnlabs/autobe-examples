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
 * Validate that deleting a category with invalid codes returns an error and
 * does not interfere with valid categories, while valid deletion still works.
 *
 * Business context
 *
 * - Category trees and categories are managed by platform administrators.
 * - Each category is uniquely identified (for external APIs) by a composite key:
 *   (categoryTreeCode, categoryCode).
 * - Deleting a category with non-existent codes should result in a not-found /
 *   domain error, but must not corrupt unrelated data.
 *
 * Test flow
 *
 * 1. Register a platform admin via POST /auth/platformAdmin/join so that the
 *    connection carries an Authorization token for subsequent catalog
 *    operations.
 * 2. Create a new category tree using POST
 *    /shoppingMall/platformAdmin/categoryTrees with a unique tree code.
 * 3. Under that tree, create a category using POST
 *    /shoppingMall/platformAdmin/categoryTrees/{categoryTreeCode}/categories
 *    and capture its code.
 * 4. Perform DELETE calls with invalid identifiers and expect errors: 4-1) DELETE
 *    with a clearly non-existent categoryTreeCode and random categoryCode. 4-2)
 *    DELETE with the valid tree code but a clearly invalid/non-existent
 *    categoryCode. For both, wrap the call in TestValidator.error (async
 *    version) to assert that an error is thrown. Do not assert on HTTP status
 *    codes.
 * 5. Finally, call DELETE with the valid (categoryTreeCode, categoryCode) pair
 *    captured from step 3, and assert that the operation succeeds (i.e., does
 *    not throw). Since the erase endpoint returns void, we only verify that no
 *    error occurs.
 *
 * Notes
 *
 * - We cannot re-fetch the category to confirm its existence/non-existence
 *   because no GET endpoint is provided in this task. Instead, we rely on the
 *   fact that the earlier invalid deletes must not prevent a subsequent valid
 *   delete from succeeding.
 * - All API responses with bodies are validated using typia.assert to ensure type
 *   correctness.
 * - The test adheres strictly to type safety: no `any`, no incorrect DTO usage,
 *   and no type-error-based negative tests.
 */
export async function test_api_category_delete_not_found_for_invalid_codes(
  connection: api.IConnection,
) {
  // 1. Join as a platform admin to obtain authorized session
  const adminRequestBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminRequestBody,
    });
  typia.assert(admin);

  // 2. Create a category tree
  const treeBody = typia.random<IShoppingMallCategoryTree.ICreate>();

  const tree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      { body: treeBody },
    );
  typia.assert(tree);

  // 3. Create a category under that tree
  const categoryBody = {
    code: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    displayOrder: typia.random<number & tags.Type<"int32">>(),
    isActive: true,
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

  // 4-1. Attempt to delete with a clearly invalid tree code and random category code
  const invalidTreeCode = "non-existent-tree-code";
  const randomCategoryCode = "random-category-code";

  await TestValidator.error(
    "deleting with non-existent tree code should fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.categoryTrees.categories.erase(
        connection,
        {
          categoryTreeCode: invalidTreeCode,
          categoryCode: randomCategoryCode,
        },
      );
    },
  );

  // 4-2. Attempt to delete with valid tree code but invalid category code
  const invalidCategoryCode = "non-existent-category-code";

  await TestValidator.error(
    "deleting with non-existent category code in valid tree should fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.categoryTrees.categories.erase(
        connection,
        {
          categoryTreeCode: tree.code,
          categoryCode: invalidCategoryCode,
        },
      );
    },
  );

  // 5. Perform a valid deletion of the existing category
  await api.functional.shoppingMall.platformAdmin.categoryTrees.categories.erase(
    connection,
    {
      categoryTreeCode: tree.code,
      categoryCode: category.code,
    },
  );
}
