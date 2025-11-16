import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate that a platform administrator can delete a category tree that has no
 * dependent categories or blocking relations.
 *
 * Business context:
 *
 * - Category trees are high-level catalog configurations addressed by a stable
 *   business `code` and stored in `shopping_mall_category_trees`.
 * - Only platform admins may manage these trees.
 * - Deleting a tree that has no dependent categories should succeed without
 *   authorization errors or integrity conflicts.
 *
 * Steps:
 *
 * 1. Join a new platform admin via /auth/platformAdmin/join to obtain an
 *    authorized session (token bound to the connection by the SDK).
 * 2. As that admin, create a new category tree via
 *    /shoppingMall/platformAdmin/categoryTrees using a unique `code` and
 *    minimal valid IShoppingMallCategoryTree.ICreate payload.
 * 3. Assert that the response matches IShoppingMallCategoryTree and that basic
 *    business fields such as `code` and `name` round-trip as expected.
 * 4. Call the erase endpoint
 *    /shoppingMall/platformAdmin/categoryTrees/{categoryTreeCode} using the
 *    created tree's code.
 * 5. Confirm that the delete call completes without throwing, implying successful
 *    deletion when there are no dependent categories and the admin is properly
 *    authorized.
 */
export async function test_api_category_tree_delete_success_with_no_dependent_categories(
  connection: api.IConnection,
) {
  // 1. Register a new platform admin and obtain an authorized session.
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
  typia.assert(admin);

  // 2. Create a new category tree with a unique business code.
  const uniqueSuffix = RandomGenerator.alphaNumeric(8);
  const treeCode = `e2e-tree-${uniqueSuffix}`;

  const createBody = {
    code: treeCode,
    name: `E2E Category Tree ${uniqueSuffix}`,
    // Explicitly mark it active and set a reasonable default locale
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

  // Basic business assertions on created tree.
  TestValidator.equals(
    "category tree code should round-trip from create request",
    created.code,
    treeCode,
  );
  TestValidator.equals(
    "category tree name should match create request",
    created.name,
    createBody.name,
  );
  TestValidator.equals(
    "category tree active flag should match create request",
    created.active,
    createBody.active ?? true,
  );
  TestValidator.equals(
    "category tree defaultLocale should match create request",
    created.defaultLocale,
    createBody.defaultLocale ?? created.defaultLocale,
  );

  // Ensure created timestamps are well-formed per DTO; typia.assert already
  // validates format, but we can additionally check non-emptiness as
  // a simple business sanity check.
  TestValidator.predicate(
    "createdAt timestamp should be non-empty",
    created.createdAt.length > 0,
  );
  TestValidator.predicate(
    "updatedAt timestamp should be non-empty",
    created.updatedAt.length > 0,
  );

  // 3. Delete the newly created category tree by its business code.
  await api.functional.shoppingMall.platformAdmin.categoryTrees.erase(
    connection,
    {
      categoryTreeCode: created.code,
    },
  );

  // If we reach this point without an HttpError, it's considered a
  // successful deletion for a tree with no dependencies and valid admin
  // authorization.
  TestValidator.predicate(
    "category tree delete should complete without throwing",
    true,
  );
}
