import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallRefundPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundPolicy";

/**
 * Ensure that GET /shoppingMall/platformAdmin/refundPolicies/{refundPolicyCode}
 * behaves correctly when a platform admin requests a refund policy by a
 * business code that does not exist.
 *
 * Business context: Platform administrators manage refund policy definitions
 * that are stored in `shopping_mall_refund_policies` and referenced by a stable
 * business `code`. Admin tools must not silently treat missing codes as valid
 * configuration; instead the backend must respond with an error when a
 * requested policy does not exist so that operators and tooling can surface a
 * clear not-found state.
 *
 * This E2E test covers the negative path: requesting a non-existent
 * `refundPolicyCode` after at least one valid policy has been created.
 *
 * Step-by-step flow:
 *
 * 1. Join as a platform admin using POST /auth/platformAdmin/join.
 *
 *    - Build a valid IShoppingMallPlatformAdminJoin.IRequest payload (email, name,
 *         password, href, referrer, ip=null).
 *    - Call api.functional.auth.platformAdmin.join and assert the
 *         IShoppingMallPlatformAdmin.IAuthorized response with typia.assert.
 *    - Rely on the SDK's side-effect to set Authorization header on the passed
 *         connection; do not touch connection.headers directly in the test.
 * 2. Seed at least one refund policy using POST
 *    /shoppingMall/platformAdmin/refundPolicies.
 *
 *    - Prepare an IShoppingMallRefundPolicy.ICreate body with:
 *
 *         - Code: a deterministic string like "existing_refund_policy".
 *         - Name: RandomGenerator.name().
 *         - AllowFullRefund: true.
 *         - AllowPartialRefund: true.
 *         - RefundWindowDays: a non-negative int32 from typia.random.
 *         - MaxRefundRate: 1.0 (full refund allowed).
 *         - IsActive: true.
 *         - All optional fields (description, requireManualApprovalOverAmount,
 *                   configurationPayload, effectiveFrom, effectiveUntil,
 *                   regionCode, policySettingCode) omitted for simplicity.
 *    - Call api.functional.shoppingMall.platformAdmin.refundPolicies.create with the
 *         body (using the `satisfies IShoppingMallRefundPolicy.ICreate`
 *         pattern) and assert the IShoppingMallRefundPolicy response with
 *         typia.assert.
 *    - Additionally verify via TestValidator.equals that the response `code` equals
 *         the requested code, using the actual-first, expected-second parameter
 *         order.
 * 3. Construct a refund policy code that is guaranteed not to exist.
 *
 *    - Start from a prefix like "nonexistent_refund_policy_" and append a random
 *         suffix from RandomGenerator.alphaNumeric(8) or
 *         typia.random<string>().
 *    - Ensure (defensively) that this unknown code is different from the seeded
 *         policy code; if a collision is detected, tweak the unknown code
 *         (e.g., append another suffix).
 * 4. Call GET /shoppingMall/platformAdmin/refundPolicies/{refundPolicyCode} with
 *    the unknown code while authenticated as the platform admin.
 *
 *    - Invoke api.functional.shoppingMall.platformAdmin.refundPolicies.at with {
 *         refundPolicyCode: unknownCode }.
 *    - Wrap this call in TestValidator.error with an async callback so the test
 *         passes only if an error is thrown.
 *    - Per global rules, do NOT assert on the HTTP status code (even though the
 *         scenario text mentions 404) and do not inspect error payload
 *         structure; simply verify that an error occurs for the unknown code.
 * 5. Do not implement any type-error testing.
 *
 *    - All DTOs must be correctly typed (no `as any`, no missing required fields)
 *         and all API calls must be awaited.
 *    - Do not touch connection.headers manually; rely entirely on the SDK join
 *         function to manage Authorization.
 */
export async function test_api_refund_policy_not_found_for_unknown_code(
  connection: api.IConnection,
) {
  // 1. Join as a platform admin to obtain an authorized session.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: "SecureP@ssw0rd",
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert(admin);

  // 2. Seed a known refund policy to ensure the table is not empty.
  const existingCode = "existing_refund_policy";

  const createBody = {
    code: existingCode,
    name: RandomGenerator.name(),
    allowFullRefund: true,
    allowPartialRefund: true,
    refundWindowDays: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    maxRefundRate: 1,
    isActive: true,
  } satisfies IShoppingMallRefundPolicy.ICreate;

  const createdPolicy =
    await api.functional.shoppingMall.platformAdmin.refundPolicies.create(
      connection,
      { body: createBody },
    );
  typia.assert(createdPolicy);

  TestValidator.equals(
    "created policy code should match request",
    createdPolicy.code,
    existingCode,
  );

  // 3. Build a refund policy code that definitely does not exist.
  const unknownBase = "nonexistent_refund_policy_";
  const unknownSuffix = RandomGenerator.alphaNumeric(8);
  let unknownCode = `${unknownBase}${unknownSuffix}`;
  if (unknownCode === existingCode) unknownCode = `${unknownCode}_x`;

  // 4. Verify that requesting the unknown code results in an error.
  await TestValidator.error(
    "unknown refund policy code should result in error",
    async () => {
      await api.functional.shoppingMall.platformAdmin.refundPolicies.at(
        connection,
        { refundPolicyCode: unknownCode },
      );
    },
  );
}
