import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAgeRestrictionPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAgeRestrictionPolicy";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPolicySetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicySetting";
import type { IShoppingMallRegionSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegionSetting";

/**
 * Validate not-found behavior when fetching an age restriction policy by a
 * non-existent code.
 *
 * Business context: Platform administrators manage age restriction policies
 * identified by unique business codes (e.g., "adult_only"). If an admin
 * accidentally requests a policy by a code that does not exist, the platform
 * must respond with a not-found style HTTP error rather than returning a fake
 * or random policy.
 *
 * Steps:
 *
 * 1. Join as a new platform administrator using POST /auth/platformAdmin/join. The
 *    SDK automatically injects the returned access token into the connection
 *    headers, so all subsequent calls are authenticated as this admin.
 * 2. Call GET
 *    /shoppingMall/platformAdmin/ageRestrictionPolicies/{ageRestrictionPolicyCode}
 *    with a clearly non-existent code ("non_existent_age_policy_e2e").
 * 3. Use TestValidator.httpError to assert that the call fails with a not-found
 *    style HTTP error (specifically 404) instead of returning an
 *    IShoppingMallAgeRestrictionPolicy record.
 * 4. Because the endpoint is documented as read-only, we implicitly rely on the
 *    contract that no age restriction policy is created as a side effect;
 *    therefore, we only need to confirm that the call fails rather than
 *    inspecting any created resources.
 */
export async function test_api_platform_admin_get_age_restriction_policy_not_found(
  connection: api.IConnection,
) {
  // 1. Join as a new platform administrator to obtain an authenticated session.
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

  // 2. Attempt to fetch an age restriction policy with a definitely non-existent code.
  const nonExistentCode = "non_existent_age_policy_e2e";

  // 3. Assert that the call results in an HttpError with a not-found (404) status.
  await TestValidator.httpError(
    "getting non-existent age restriction policy should fail with not-found error",
    404,
    async () => {
      await api.functional.shoppingMall.platformAdmin.ageRestrictionPolicies.at(
        connection,
        {
          ageRestrictionPolicyCode: nonExistentCode,
        },
      );
    },
  );
}
