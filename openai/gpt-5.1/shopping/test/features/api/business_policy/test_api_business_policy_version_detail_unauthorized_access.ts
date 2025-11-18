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
 * Verify unauthorized access to business policy version detail endpoint.
 *
 * Business context: Admins manage high-level business policies (refund rules,
 * review moderation, risk thresholds, etc.) and their concrete versions. The
 * detail endpoint GET
 * /shoppingMall/admin/businessPolicies/{policyCode}/versions/{versionCode} is
 * explicitly documented as admin-only. It must not be callable by
 * unauthenticated clients; otherwise sensitive policy text and parameters could
 * be leaked.
 *
 * This test ensures that even when a valid policy and version exist, an
 * unauthenticated caller cannot read the version detail.
 *
 * Test steps:
 *
 * 1. Register a new admin using POST /auth/admin/join, which returns
 *    IShoppingMallAdmin.IAuthorized and implicitly configures the Authorization
 *    header on the shared connection.
 * 2. As that admin, create a business policy via POST
 *    /shoppingMall/admin/businessPolicies using a fully-populated
 *    IShoppingMallBusinessPolicy.ICreate body (policy_code, name, category,
 *    optional description, and is_active flag). Assert the response type.
 * 3. As the same admin, create a policy version under that policy using POST
 *    /shoppingMall/admin/businessPolicies/{policyCode}/versions with
 *    IShoppingMallPolicyVersion.ICreate (version_code, title, body_markdown,
 *    optional parameters_json, status, optional effective_from/
 *    effective_until). Assert the response type.
 * 4. Build an unauthenticated connection by cloning the original api.IConnection
 *    and overriding headers with an empty object, without further touching
 *    connection.headers to comply with SDK ownership.
 * 5. Using the unauthenticated connection, call
 *    api.functional.shoppingMall.admin.businessPolicies.versions.at with the
 *    policyCode and versionCode created earlier.
 * 6. Wrap this call in TestValidator.httpError with a descriptive title, asserting
 *    that an HttpError with an authorization-related status code (401 or 403)
 *    is thrown. This confirms that the server rejects the request as
 *    unauthorized and does not return an IShoppingMallPolicyVersion payload.
 */
export async function test_api_business_policy_version_detail_unauthorized_access(
  connection: api.IConnection,
) {
  // 1. Register a new admin and obtain authorized context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create a business policy under this admin context
  const policyCreateBody = {
    policy_code: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 3 }),
    category: RandomGenerator.alphaNumeric(8),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_active: true,
  } satisfies IShoppingMallBusinessPolicy.ICreate;

  const policy: IShoppingMallBusinessPolicy =
    await api.functional.shoppingMall.admin.businessPolicies.create(
      connection,
      {
        body: policyCreateBody,
      },
    );
  typia.assert<IShoppingMallBusinessPolicy>(policy);

  // 3. Create a policy version for that policy
  const versionCreateBody = {
    version_code: RandomGenerator.alphaNumeric(10),
    title: RandomGenerator.paragraph({ sentences: 4 }),
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
        policyCode: policyCreateBody.policy_code,
        body: versionCreateBody,
      },
    );
  typia.assert<IShoppingMallPolicyVersion>(version);

  // 4. Prepare an unauthenticated connection (no Authorization header)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 5 & 6. Attempt to read the policy version detail without auth and
  // assert that an HTTP authorization error (401 or 403) is thrown.
  await TestValidator.httpError(
    "unauthenticated caller cannot access business policy version detail",
    [401, 403],
    async () => {
      return await api.functional.shoppingMall.admin.businessPolicies.versions.at(
        unauthenticatedConnection,
        {
          policyCode: policyCreateBody.policy_code,
          versionCode: versionCreateBody.version_code,
        },
      );
    },
  );
}
