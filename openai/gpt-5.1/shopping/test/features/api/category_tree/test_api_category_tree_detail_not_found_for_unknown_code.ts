import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate not-found behavior when requesting a category tree by an unknown
 * code as a platform admin.
 *
 * Business context: Platform admins manage catalog category trees identified by
 * stable business codes. When an admin attempts to fetch a category tree with a
 * code that does not exist, the backend should respond with a not-found style
 * error instead of returning a valid IShoppingMallCategoryTree object. This
 * test ensures error-path behavior under valid authentication.
 *
 * Test flow:
 *
 * 1. Join a platform admin using POST /auth/platformAdmin/join via
 *    api.functional.auth.platformAdmin.join, providing an
 *    IShoppingMallPlatformAdminJoin.IRequest body constructed with realistic
 *    values (email, name, password, href, referrer). This also wires
 *    Authorization headers automatically.
 * 2. Optionally create a valid category tree via POST
 *    /shoppingMall/platformAdmin/categoryTrees using
 *    api.functional.shoppingMall.platformAdmin.categoryTrees.create, with a
 *    unique code and basic metadata. This step validates that authentication
 *    and the create endpoint both function, though the created tree is not
 *    directly used for the not-found lookup.
 * 3. Construct a definitely-unknown categoryTreeCode string. To minimize collision
 *    risk, use a fixed prefix such as "non-existent-tree-" combined with
 *    RandomGenerator.alphaNumeric to build a long random suffix. Also
 *    explicitly ensure this code does not equal any created tree.code from step
 *    2.
 * 4. Invoke api.functional.shoppingMall.platformAdmin.categoryTrees.at with the
 *    unknown code while the platform admin session is active.
 * 5. Use TestValidator.error with an async closure to assert that the call results
 *    in an error. Per testing constraints, do not assert on specific HTTP
 *    status codes or error payload structure; only assert that an error is
 *    thrown and that a success response is not produced.
 * 6. The test passes if the unknown code lookup fails with an error under valid
 *    admin authentication and never returns an IShoppingMallCategoryTree. If
 *    the call unexpectedly succeeds, the validator will fail the test.
 */
export async function test_api_category_tree_detail_not_found_for_unknown_code(
  connection: api.IConnection,
) {
  // 1. Join a platform admin to obtain an authenticated admin session.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Optionally create a valid category tree to confirm system functionality.
  const createdTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      {
        body: {
          code: `existing-tree-${RandomGenerator.alphaNumeric(12)}`,
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 4 }),
          active: true,
          defaultLocale: "en-US",
        } satisfies IShoppingMallCategoryTree.ICreate,
      },
    );
  typia.assert(createdTree);

  // 3. Construct a categoryTreeCode that is guaranteed not to match the created tree's code.
  //    Use a long random suffix and explicitly ensure it differs from createdTree.code.
  let unknownCode = `non-existent-tree-${RandomGenerator.alphaNumeric(24)}`;
  if (unknownCode === createdTree.code) {
    unknownCode = `non-existent-tree-${RandomGenerator.alphaNumeric(32)}`;
  }

  // 4 & 5. Call the detail endpoint with the unknown code and assert that it fails with an error.
  await TestValidator.error(
    "unknown categoryTreeCode must result in an error",
    async () => {
      await api.functional.shoppingMall.platformAdmin.categoryTrees.at(
        connection,
        {
          categoryTreeCode: unknownCode,
        },
      );
    },
  );
}
