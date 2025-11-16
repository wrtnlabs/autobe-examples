import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Update locale and activation of a category tree in a single atomic operation.
 *
 * Business scenario: A platform administrator wants to roll out a
 * pre-configured category tree to a new target region in one step by changing
 * both its `defaultLocale` and `active` status together. This test verifies
 * that the update endpoint supports such combined configuration changes without
 * splitting them into multiple requests and that immutable identifiers remain
 * stable.
 *
 * Steps:
 *
 * 1. Join as a platform admin via POST /auth/platformAdmin/join to obtain an
 *    authenticated admin session.
 * 2. Create a new category tree via POST /shoppingMall/platformAdmin/categoryTrees
 *    with a unique `code`, initial `defaultLocale` (e.g., "en-US"), and `active
 *    = false` to represent a pre-rollout configuration.
 * 3. Call PUT /shoppingMall/platformAdmin/categoryTrees/{categoryTreeCode} using
 *    the created `code` as the path parameter and an
 *    IShoppingMallCategoryTree.IUpdate body that sets `defaultLocale` to a
 *    different locale (e.g., "fr-FR") and `active = true` simultaneously.
 * 4. Assert that the response is an IShoppingMallCategoryTree where `id` and
 *    `code` are unchanged from creation, while `defaultLocale` and `active`
 *    reflect the update payload.
 * 5. Verify that `updatedAt` is chronologically not earlier than `createdAt`,
 *    confirming that the combined configuration change is persisted and
 *    timestamped correctly.
 */
export async function test_api_category_tree_update_locale_and_activation_together(
  connection: api.IConnection,
) {
  // 1. Bootstrap a platform admin via join to obtain an authenticated admin session
  const joinBody = {
    email: `platform-admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/onboarding",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create a category tree in a staging configuration (inactive, initial locale)
  const initialLocale = "en-US";
  const initialActive = false;
  const treeCode = `ROLL-OUT-TREE-${RandomGenerator.alphaNumeric(6)}`;

  const createBody = {
    code: treeCode,
    name: "Rollout Test Tree",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    active: initialActive,
    defaultLocale: initialLocale,
  } satisfies IShoppingMallCategoryTree.ICreate;

  const created: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(created);

  // Sanity checks on created entity
  TestValidator.equals(
    "created tree code matches requested code",
    created.code,
    treeCode,
  );
  TestValidator.equals(
    "created tree defaultLocale matches initial value",
    created.defaultLocale,
    initialLocale,
  );
  TestValidator.equals(
    "created tree active matches initial flag",
    created.active,
    initialActive,
  );

  // 3. Update both defaultLocale and active together via PUT
  const targetLocale = "fr-FR";
  const updateBody = {
    defaultLocale: targetLocale,
    active: true,
  } satisfies IShoppingMallCategoryTree.IUpdate;

  const updated: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.update(
      connection,
      {
        categoryTreeCode: treeCode,
        body: updateBody,
      },
    );
  typia.assert(updated);

  // 4. Validate updated tree properties and immutables
  TestValidator.equals(
    "updated tree id remains unchanged",
    updated.id,
    created.id,
  );
  TestValidator.equals(
    "updated tree code remains unchanged",
    updated.code,
    created.code,
  );
  TestValidator.equals(
    "updated tree defaultLocale reflects target locale",
    updated.defaultLocale,
    targetLocale,
  );
  TestValidator.equals(
    "updated tree active flag is true after rollout",
    updated.active,
    true,
  );

  // 5. Verify timestamp consistency: updatedAt should not be earlier than createdAt
  const createdAtMs = Date.parse(created.createdAt);
  const updatedAtMs = Date.parse(updated.updatedAt);

  TestValidator.predicate(
    "createdAt is a valid date",
    Number.isFinite(createdAtMs),
  );
  TestValidator.predicate(
    "updatedAt is a valid date",
    Number.isFinite(updatedAtMs),
  );

  TestValidator.predicate(
    "updatedAt is not earlier than createdAt",
    () => updatedAtMs >= createdAtMs,
  );
}
