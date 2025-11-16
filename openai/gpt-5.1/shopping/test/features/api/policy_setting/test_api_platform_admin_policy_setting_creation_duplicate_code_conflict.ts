import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPolicySetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicySetting";

/**
 * Verify that creating a duplicate policy setting profile with the same
 * business code fails.
 *
 * Business context: Platform administrators define reusable policy setting
 * profiles in shopping_mall_policy_settings. Each profile is uniquely
 * identified by a business `code`, used as a stable reference by other policy
 * domains. The backend enforces a unique index on `code` and must reject
 * attempts to create a second profile with an already-used code.
 *
 * Test steps:
 *
 * 1. Register a platform admin via POST /auth/platformAdmin/join to obtain an
 *    authenticated session (token is handled automatically by the SDK).
 * 2. Create an initial policy setting profile via POST
 *    /shoppingMall/platformAdmin/policySettings with a unique `code`.
 * 3. Verify the first creation succeeds and returns a valid
 *    IShoppingMallPolicySetting with the expected `code`.
 * 4. Attempt to create a second policy setting profile with the same `code` but
 *    different non-key fields (e.g., name/description/config_payload).
 * 5. Assert that the second creation fails by throwing an error (conflict due to
 *    duplicate `code`). We do not assert specific HTTP status codes or error
 *    body contents, only that an error is thrown.
 */
export async function test_api_platform_admin_policy_setting_creation_duplicate_code_conflict(
  connection: api.IConnection,
) {
  // 1. Register a platform admin to obtain an authenticated connection
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create an initial policy setting profile with a unique business code
  const baseCode = "duplicate_code_test_" + RandomGenerator.alphaNumeric(8);

  const firstCreateBody = {
    code: baseCode,
    name: "Duplicate Code Test Policy (original)",
    category: "cancellation",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    config_payload: RandomGenerator.content({ paragraphs: 2 }),
    active: true,
    effective_from: new Date().toISOString(),
    effective_to: null,
  } satisfies IShoppingMallPolicySetting.ICreate;

  const firstPolicy: IShoppingMallPolicySetting =
    await api.functional.shoppingMall.platformAdmin.policySettings.create(
      connection,
      { body: firstCreateBody },
    );
  typia.assert(firstPolicy);

  // Confirm that the created policy has the expected code
  TestValidator.equals(
    "created policy code should match requested code",
    firstPolicy.code,
    baseCode,
  );

  // 3. Attempt to create a second profile with the same code but different fields
  const secondCreateBody = {
    code: baseCode, // intentionally identical to trigger unique index
    name: "Duplicate Code Test Policy (duplicate)",
    category: "cancellation",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    config_payload: RandomGenerator.content({ paragraphs: 1 }),
    active: true,
    effective_from: firstCreateBody.effective_from,
    effective_to: null,
  } satisfies IShoppingMallPolicySetting.ICreate;

  await TestValidator.error(
    "creating a second policy with the same code must fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.policySettings.create(
        connection,
        { body: secondCreateBody },
      );
    },
  );
}
