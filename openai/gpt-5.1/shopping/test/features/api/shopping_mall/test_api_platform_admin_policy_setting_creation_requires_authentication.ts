import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPolicySetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicySetting";

/**
 * Verify that creating shopping mall policy setting profiles requires platform
 * administrator authentication and that anonymous callers are rejected.
 *
 * Business context: Platform-level policy settings (for cancellation, refund,
 * reviews, etc.) are highly sensitive configuration objects which must only be
 * managed by authenticated platform administrators. The POST
 * /shoppingMall/platformAdmin/policySettings endpoint is restricted to the
 * `platformAdmin` actor and should not allow unauthenticated clients to create
 * profiles, even if they provide syntactically valid payloads.
 *
 * Test steps:
 *
 * 1. Bootstrap a platform administrator account using POST
 *    /auth/platformAdmin/join to ensure the backend and SDK are correctly wired
 *    for admin flows and to have a reference of a valid authenticated
 *    connection.
 * 2. Prepare a syntactically valid IShoppingMallPolicySetting.ICreate payload for
 *    a new policy setting profile.
 * 3. Derive an unauthenticated connection object from the existing connection by
 *    cloning it and overriding headers with an empty object. This simulates an
 *    anonymous caller, as any Authorization header previously set by the join()
 *    call is removed.
 * 4. Call api.functional.shoppingMall.platformAdmin.policySettings.create using
 *    the unauthenticated connection and the valid payload, wrapped in
 *    TestValidator.error to assert that the operation fails for unauthenticated
 *    callers.
 * 5. As a control, invoke the same creation endpoint again using the authenticated
 *    connection (which carries the platformAdmin token set by join()) and
 *    assert that it succeeds and returns a IShoppingMallPolicySetting instance
 *    whose key business fields (for example, `code`) match the request
 *    payload.
 */
export async function test_api_platform_admin_policy_setting_creation_requires_authentication(
  connection: api.IConnection,
) {
  // 1. Bootstrap a platform administrator via join()
  const adminJoinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuthorized = await api.functional.auth.platformAdmin.join(
    connection,
    { body: adminJoinRequest },
  );
  typia.assert(adminAuthorized as IShoppingMallPlatformAdmin.IAuthorized);

  // 2. Prepare a valid policy setting creation payload
  const basePolicyCreate = typia.random<IShoppingMallPolicySetting.ICreate>();
  const policyCreateBody = {
    ...basePolicyCreate,
    code: `test_policy_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    category: RandomGenerator.pick([
      "cancellation",
      "refund",
      "review",
      "age_restriction",
    ] as const),
  } satisfies IShoppingMallPolicySetting.ICreate;

  // 3. Build an unauthenticated connection (no Authorization header)
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 4. Verify that unauthenticated caller cannot create policy settings
  await TestValidator.error(
    "unauthenticated caller cannot create policy setting profile",
    async () => {
      await api.functional.shoppingMall.platformAdmin.policySettings.create(
        unauthConnection,
        { body: policyCreateBody },
      );
    },
  );

  // 5. Control: authenticated platformAdmin can create policy settings
  const createdPolicy =
    await api.functional.shoppingMall.platformAdmin.policySettings.create(
      connection,
      { body: policyCreateBody },
    );
  typia.assert(createdPolicy as IShoppingMallPolicySetting);

  TestValidator.equals(
    "created policy code matches request code",
    createdPolicy.code,
    policyCreateBody.code,
  );
}
