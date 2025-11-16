import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPolicySetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicySetting";

/**
 * Verify that policy setting retrieval requires platform admin authentication.
 *
 * Business/security context:
 *
 * - /shoppingMall/platformAdmin/policySettings/{policySettingCode} is a
 *   platform-admin-only endpoint, guarded by the "platformAdmin" actor.
 * - Anonymous callers must not be able to retrieve any policy profile.
 * - This test focuses purely on access control (auth required), not on data
 *   presence for a particular policySettingCode.
 *
 * High-level steps:
 *
 * 1. Join as a new platform administrator using POST /auth/platformAdmin/join to
 *    ensure that the dependency works and obtain an authenticated session (SDK
 *    mutates the provided connection with the access token).
 * 2. Prepare an unauthenticated connection by cloning the original connection but
 *    providing an empty headers object so that no Authorization header is sent.
 *    Do not mutate the original connection headers.
 * 3. Using the unauthenticated connection, invoke GET
 *    /shoppingMall/platformAdmin/policySettings/{policySettingCode} with an
 *    arbitrary policySettingCode and validate that the call fails, proving that
 *    anonymous access is rejected.
 *
 * Note:
 *
 * - We deliberately do not assert an authenticated success on a concrete
 *   policySettingCode because there is no companion API to create or guarantee
 *   the existence of a specific policy setting in this test. Other E2E tests
 *   cover the happy-path retrieval semantics and type guarantees for
 *   IShoppingMallPolicySetting.
 */
export async function test_api_platform_admin_policy_setting_retrieval_requires_authentication(
  connection: api.IConnection,
) {
  // 1. Join as a new platform administrator to establish authenticated context
  const joinRequestBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const authorizedAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinRequestBody,
    });
  typia.assert(authorizedAdmin);

  // 2. Prepare an unauthenticated connection (no Authorization header)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 3. Anonymous access must fail
  const anonymousPolicyCode: string = typia.random<string>();

  await TestValidator.error(
    "anonymous access to policy settings must be rejected",
    async () => {
      await api.functional.shoppingMall.platformAdmin.policySettings.at(
        unauthenticatedConnection,
        {
          policySettingCode: anonymousPolicyCode,
        },
      );
    },
  );
}
