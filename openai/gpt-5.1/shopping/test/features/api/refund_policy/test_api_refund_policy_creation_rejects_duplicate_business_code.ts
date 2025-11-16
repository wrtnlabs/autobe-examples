import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallRefundPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundPolicy";

/**
 * Ensure refund policy creation enforces unique business code.
 *
 * Business goal
 *
 * - Verify that POST /shoppingMall/platformAdmin/refundPolicies rejects attempts
 *   to create a second policy with an already used business `code`.
 * - This protects downstream order, payment, and admin tooling from ambiguous
 *   references by guaranteeing that `code` is globally unique.
 *
 * High level flow
 *
 * 1. Bootstrap a platform admin using POST /auth/platformAdmin/join so that the
 *    connection carries a valid admin Authorization header.
 * 2. Create an initial refund policy with a deterministic business code such as
 *    "duplicate_code_test_..." plus random suffix to avoid cross-test
 *    interference.
 * 3. Assert that the first creation succeeds and returns a valid
 *    IShoppingMallRefundPolicy whose `code` matches the request body and whose
 *    structural shape passes typia.assert.
 * 4. Attempt to create a second refund policy using the same `code` while varying
 *    non-unique fields (e.g., name/description) to prove that uniqueness is
 *    based on `code` only.
 * 5. Assert that the second creation fails with an HTTP conflict-style error (409
 *    or other 4xx constraint error) using TestValidator.httpError.
 *
 * Implementation notes
 *
 * - Use IShoppingMallPlatformAdminJoin.IRequest as request body for join.
 * - Use IShoppingMallRefundPolicy.ICreate for the refund policy creation bodies.
 *   Ensure all required fields are populated:
 *
 *   - Code: deterministic string base + random tail
 *   - Name: RandomGenerator.paragraph({ sentences: 2 }) or similar
 *   - AllowFullRefund / allowPartialRefund / isActive: booleans
 *   - RefundWindowDays: valid non-negative int32 (e.g., 30)
 *   - MaxRefundRate: number between 0 and 1 (e.g., 1.0)
 *   - RequireManualApprovalOverAmount, configurationPayload,
 *       effectiveFrom/effectiveUntil, regionCode, policySettingCode: optional
 *       fields that can be omitted or set to null where allowed by DTO.
 * - The SDK join() function automatically sets connection.headers.Authorization
 *   from the returned token, so there is no direct header manipulation.
 * - For the duplicate creation error, use TestValidator.httpError instead of
 *   checking raw status codes manually. We cannot rely on a specific 409 vs 422
 *   vs 400 code, so configure httpError with [400, 409, 422] to accept any
 *   client-side constraint failure family relevant to uniqueness violations.
 */
export async function test_api_refund_policy_creation_rejects_duplicate_business_code(
  connection: api.IConnection,
) {
  // 1. Register a platform admin to obtain an authorized connection
  const joinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://admin.example.com/signup",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Prepare a stable business code for both creations
  const baseCode = `duplicate_code_test_${RandomGenerator.alphaNumeric(8)}`;

  const firstPolicyBody = {
    code: baseCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    allowFullRefund: true,
    allowPartialRefund: true,
    refundWindowDays: 30,
    maxRefundRate: 1.0,
    requireManualApprovalOverAmount: 100000,
    configurationPayload: JSON.stringify({ reason: "duplicate code test" }),
    isActive: true,
    effectiveFrom: new Date().toISOString(),
    effectiveUntil: null,
    regionCode: null,
    policySettingCode: null,
  } satisfies IShoppingMallRefundPolicy.ICreate;

  const created: IShoppingMallRefundPolicy =
    await api.functional.shoppingMall.platformAdmin.refundPolicies.create(
      connection,
      {
        body: firstPolicyBody,
      },
    );
  typia.assert(created);

  TestValidator.equals(
    "first refund policy code must match request body",
    created.code,
    firstPolicyBody.code,
  );

  // 3. Attempt duplicate creation with same code but different descriptive fields
  const secondPolicyBody = {
    code: baseCode, // same business code to trigger unique constraint
    name: `${RandomGenerator.paragraph({ sentences: 1 })} (duplicate attempt)`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    allowFullRefund: false,
    allowPartialRefund: true,
    refundWindowDays: 60,
    maxRefundRate: 0.5,
    requireManualApprovalOverAmount: 50000,
    configurationPayload: JSON.stringify({
      reason: "duplicate creation should fail",
    }),
    isActive: true,
    effectiveFrom: new Date().toISOString(),
    effectiveUntil: null,
    regionCode: null,
    policySettingCode: null,
  } satisfies IShoppingMallRefundPolicy.ICreate;

  await TestValidator.httpError(
    "creating refund policy with duplicate code must fail",
    [400, 409, 422],
    async () => {
      await api.functional.shoppingMall.platformAdmin.refundPolicies.create(
        connection,
        {
          body: secondPolicyBody,
        },
      );
    },
  );
}
