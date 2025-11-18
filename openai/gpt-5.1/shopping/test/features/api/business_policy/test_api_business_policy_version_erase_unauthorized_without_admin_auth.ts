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
 * Validate that erasing a business policy version without admin authentication
 * is rejected and does not affect the authenticated admin session.
 *
 * Business goal
 *
 * - Ensure DELETE
 *   /shoppingMall/admin/businessPolicies/{policyCode}/versions/{versionCode} is
 *   protected by admin authentication.
 * - Confirm that anonymous calls cannot perform destructive actions.
 *
 * Covered steps
 *
 * 1. Prepare an "unauthenticated" connection by cloning the given connection and
 *    replacing its headers with an empty object. Never modify this clone's
 *    headers after creation.
 * 2. Call the erase endpoint with arbitrary policyCode/versionCode via this
 *    unauthenticated connection and assert that an HTTP error is thrown.
 * 3. Join an admin using POST /auth/admin/join on the original connection to
 *    obtain an authenticated admin context.
 * 4. With the authenticated admin connection, create a real business policy and a
 *    real policy version.
 * 5. Using the unauthenticated connection again, attempt to erase the real version
 *    by passing its policy_code and version_code, and assert that an HTTP error
 *    is thrown.
 * 6. Finally, perform a no-op authenticated call (e.g., creating another policy)
 *    to verify that the authenticated connection still works after the failed
 *    unauthorized attempts.
 */
export async function test_api_business_policy_version_erase_unauthorized_without_admin_auth(
  connection: api.IConnection,
) {
  // 1. Prepare an unauthenticated connection by cloning with empty headers
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 2. Anonymous erase attempt with random codes should fail with HttpError
  await TestValidator.httpError(
    "anonymous erase with random codes must be rejected",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.admin.businessPolicies.versions.erase(
        unauthConn,
        {
          policyCode: RandomGenerator.alphaNumeric(12),
          versionCode: RandomGenerator.alphaNumeric(8),
        },
      );
    },
  );

  // 3. Join an admin (original connection becomes authenticated)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.test.local/join",
    referrer: "https://admin.test.local/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuth);
  typia.assert<IAuthorizationToken>(adminAuth.token);

  // 4. Create a real business policy using authenticated connection
  const policyBody = {
    policy_code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    category: "refund",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    is_active: true,
  } satisfies IShoppingMallBusinessPolicy.ICreate;

  const policy: IShoppingMallBusinessPolicy =
    await api.functional.shoppingMall.admin.businessPolicies.create(
      connection,
      {
        body: policyBody,
      },
    );
  typia.assert<IShoppingMallBusinessPolicy>(policy);

  // 5. Create a concrete policy version under that policy
  const versionBody = {
    version_code: "v1",
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body_markdown: RandomGenerator.content({ paragraphs: 2 }),
    parameters_json: null,
    status: "draft",
    effective_from: null,
    effective_until: null,
  } satisfies IShoppingMallPolicyVersion.ICreate;

  const version: IShoppingMallPolicyVersion =
    await api.functional.shoppingMall.admin.businessPolicies.versions.create(
      connection,
      {
        policyCode: policy.policy_code,
        body: versionBody,
      },
    );
  typia.assert<IShoppingMallPolicyVersion>(version);

  // 6. Attempt to erase this concrete version using the unauthenticated connection
  await TestValidator.httpError(
    "anonymous erase for existing version must be rejected",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.admin.businessPolicies.versions.erase(
        unauthConn,
        {
          policyCode: policy.policy_code,
          versionCode: version.version_code,
        },
      );
    },
  );

  // 7. Sanity check: authenticated connection can still perform admin operations
  const secondPolicyBody = {
    policy_code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    category: "refund",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    is_active: false,
  } satisfies IShoppingMallBusinessPolicy.ICreate;

  const secondPolicy: IShoppingMallBusinessPolicy =
    await api.functional.shoppingMall.admin.businessPolicies.create(
      connection,
      {
        body: secondPolicyBody,
      },
    );
  typia.assert<IShoppingMallBusinessPolicy>(secondPolicy);
}
