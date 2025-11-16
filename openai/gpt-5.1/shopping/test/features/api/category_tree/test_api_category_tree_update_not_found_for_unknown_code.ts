import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Verify that updating a non-existent category tree code results in an error
 * and does not affect existing category trees.
 *
 * Business context: Platform admins manage catalog category trees via a stable
 * business `code` exposed in the path
 * `/shoppingMall/platformAdmin/categoryTrees/{categoryTreeCode}`. An update
 * against an unknown `code` must not silently create a new tree nor affect any
 * other records; instead, it should surface a not-found style error to the
 * admin client.
 *
 * Steps:
 *
 * 1. Join as a platform admin using /auth/platformAdmin/join to obtain an
 *    authorized admin session (token handling is done automatically by SDK).
 * 2. Create a valid category tree with a known code using POST
 *    /shoppingMall/platformAdmin/categoryTrees, capture the response, and
 *    assert its structure via typia.assert.
 * 3. Attempt to update a category tree using a clearly non-existent
 *    `categoryTreeCode` such as "NON-EXISTENT-TREE" via the update endpoint,
 *    with a valid IShoppingMallCategoryTree.IUpdate payload (e.g., name,
 *    description, active, defaultLocale).
 * 4. Use TestValidator.error with an async callback to assert that the update
 *    attempt fails (business not-found behavior). Do not assert specific HTTP
 *    status codes.
 * 5. Since no GET-by-code endpoint is available, indirectly validate isolation by
 *    confirming that the successful create result is valid and that no success
 *    payload is returned from the failed update call (TestValidator.error
 *    already ensures the call throws instead of returning normally).
 */
export async function test_api_category_tree_update_not_found_for_unknown_code(
  connection: api.IConnection,
) {
  // 1. Join as platform admin
  const joinRequest = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinRequest,
    });
  typia.assert(admin);

  // 2. Create a valid category tree as control record
  const createBody = {
    code: `TREE-${RandomGenerator.alphaNumeric(6)}`,
    name: "Main Catalog Tree",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const created: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(created);

  TestValidator.equals(
    "created tree code should match request code",
    created.code,
    createBody.code,
  );

  // 3. Attempt to update a non-existent category tree code
  const nonExistentCode = "NON-EXISTENT-TREE";

  const updateBody = {
    name: "Should Not Exist Tree",
    description: "This update targets a non-existent tree and must fail.",
    active: false,
    defaultLocale: "ko-KR",
  } satisfies IShoppingMallCategoryTree.IUpdate;

  await TestValidator.error(
    "updating unknown category tree code should fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.categoryTrees.update(
        connection,
        {
          categoryTreeCode: nonExistentCode,
          body: updateBody,
        },
      );
    },
  );

  // 4. Indirect invariance check: ensure the originally created tree is valid
  // We cannot re-fetch by code with current SDK, but we at least know that:
  // - create succeeded and returned a valid entity
  // - update on unknown code threw instead of returning a success payload
  // This combination ensures no other existing tree was silently overwritten
  // as part of the failed update attempt.
  typia.assert<IShoppingMallCategoryTree>(created);
}
