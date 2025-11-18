import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallBusinessPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBusinessPolicy";
import type { IShoppingMallPolicyVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicyVersion";

/**
 * Validate that requesting a specific business policy version for a
 * non-existent policyCode results in a not-found style error and does not
 * return a policy version object.
 *
 * Business context:
 *
 * - Business policies are versioned by a logical policy code (policyCode) and a
 *   versionCode like "v1" or semantic/dated codes.
 * - Admin tools may construct URLs to specific versions, but if the policyCode is
 *   unknown (no shopping_mall_business_policies row), the lookup must fail as a
 *   resource-not-found scenario, not as an auth or generic error.
 *
 * Test workflow:
 *
 * 1. Register a new admin using POST /auth/admin/join to obtain an authenticated
 *    context.
 *
 *    - Use realistic IShoppingMallAdminJoin.ICreate data including email, password,
 *         and minimal session fields (href, referrer); ip can be omitted.
 *    - Ensure the returned IShoppingMallAdmin.IAuthorized payload is structurally
 *         valid with typia.assert.
 *    - This step also configures the connection Authorization header via the SDK.
 * 2. Call GET
 *    /shoppingMall/admin/businessPolicies/{policyCode}/versions/{versionCode}
 *    using a fabricated, clearly non-existent policyCode such as
 *    "unknown_policy" and a plausible versionCode like "v1".
 *
 *    - Because we never create any business policy in this test, the combination
 *         (policyCode, versionCode) must not exist in the backing tables.
 * 3. Verify that the call fails with an HTTP-level not-found style error rather
 *    than returning an IShoppingMallPolicyVersion object.
 *
 *    - Use TestValidator.error with an async closure around the API call to ensure
 *         an error is thrown.
 *    - Do NOT attempt to inspect HTTP status codes explicitly (e.g., 404), as test
 *         guidelines prohibit status-code-specific assertions. Instead, we only
 *         assert that some error is raised when requesting an unknown policy.
 * 4. As a safety net, if the API were to succeed unexpectedly and return a
 *    IShoppingMallPolicyVersion, typia.assert would validate the shape but the
 *    test harness (TestValidator.error) would treat the absence of an error as
 *    a test failure.
 *
 * Notes and constraints:
 *
 * - Authentication headers are managed by the SDK; the test must not touch
 *   connection.headers directly.
 * - Do not attempt to create any business policies or versions; this test focuses
 *   purely on the not-found behavior for unknown policyCode.
 * - Avoid checking specific HTTP status codes or error payload structure; only
 *   assert that an error occurs when the unknown policy version is requested.
 */
export async function test_api_business_policy_version_detail_not_found_for_unknown_policy(
  connection: api.IConnection,
) {
  // 1. Admin joins to obtain an authenticated context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Prepare fabricated unknown policyCode and plausible versionCode
  const unknownPolicyCode = "unknown_policy";
  const versionCode = "v1";

  // 3. Verify that requesting the version for unknown policyCode results in an error
  await TestValidator.error(
    "unknown business policy version should not be found",
    async () => {
      await api.functional.shoppingMall.admin.businessPolicies.versions.at(
        connection,
        {
          policyCode: unknownPolicyCode,
          versionCode,
        },
      );
    },
  );
}
