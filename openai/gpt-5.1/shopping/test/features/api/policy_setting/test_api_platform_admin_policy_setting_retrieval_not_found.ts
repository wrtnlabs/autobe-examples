import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPolicySetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicySetting";

/**
 * Ensure that a platform admin cannot retrieve a policy setting profile by a
 * non-existent business code.
 *
 * ## Business context
 *
 * Platform administrators manage shopping mall policy setting profiles
 * identified by unique business codes (e.g., "default_cancellation_profile").
 * When a profile is requested by a code that does not exist, the backend must
 * not return any IShoppingMallPolicySetting data and should instead respond
 * with a not-found style error. The error must be raised through the HTTP
 * client layer rather than returning a successful response with an unrelated
 * profile.
 *
 * This test focuses on that negative path under a properly authenticated
 * platform admin session.
 *
 * ## High-level steps
 *
 * 1. Register a new platform administrator via POST /auth/platformAdmin/join using
 *    a realistic IShoppingMallPlatformAdminJoin.IRequest payload.
 *
 *    - This both creates the admin identity and establishes an authorized session,
 *         with the SDK wiring the issued access token into
 *         connection.headers.Authorization automatically.
 * 2. Construct a policySettingCode string that is extremely unlikely to exist, by
 *    combining a fixed prefix like "nonexistent_policy_" with a random
 *    alphanumeric suffix.
 * 3. Call GET /shoppingMall/platformAdmin/policySettings/{policySettingCode} using
 *    api.functional.shoppingMall.platformAdmin.policySettings.at with the
 *    generated non-existent code.
 * 4. Use TestValidator.error to assert that the call fails (throws) rather than
 *    returning an IShoppingMallPolicySetting instance. This ensures the backend
 *    does not mistakenly treat unknown codes as valid profiles.
 *
 * ## Notes
 *
 * - We do not assert a specific HTTP status code or error body shape, in
 *   accordance with the global testing rules that prohibit explicit status-code
 *   and low-level error-body validation.
 * - We also avoid manipulating connection.headers directly; token wiring is
 *   entirely delegated to the join endpoint implementation.
 */
export async function test_api_platform_admin_policy_setting_retrieval_not_found(
  connection: api.IConnection,
) {
  // 1. Register a platform administrator and establish an authorized session
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(1),
    password: "StrongP@ssw0rd",
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Build a policySettingCode that should not exist
  const nonexistentCodePrefix = "nonexistent_policy_";
  const nonexistentCodeSuffix = RandomGenerator.alphaNumeric(16);
  const nonexistentPolicyCode = `${nonexistentCodePrefix}${nonexistentCodeSuffix}`;

  // 3. Attempt to retrieve the policy setting by the non-existent code,
  //    expecting the backend to fail rather than return a profile.
  await TestValidator.error(
    "policy setting lookup by non-existent code should fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.policySettings.at(
        connection,
        {
          policySettingCode: nonexistentPolicyCode,
        },
      );
    },
  );
}
