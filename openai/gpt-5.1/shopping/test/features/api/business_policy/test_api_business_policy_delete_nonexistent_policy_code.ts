import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallBusinessPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBusinessPolicy";

/**
 * Verify deletion behavior for non-existent business policy codes.
 *
 * This test ensures that when an authenticated admin attempts to delete a
 * business policy by a policyCode that does not exist in the
 * shopping_mall_business_policies table, the API responds with an HTTP error
 * (e.g., 404 Not Found) and does not create or resurrect any policy as a side
 * effect.
 *
 * Business context:
 *
 * - Business policies are core governance artifacts, identified externally by a
 *   stable policy_code (e.g., "refund_standard").
 * - Deleting a policy is a high-privilege admin operation and must behave safely
 *   when the target code is unknown: return an error instead of silently
 *   succeeding or creating a new policy.
 *
 * Steps:
 *
 * 1. Register an admin via POST /auth/admin/join to obtain an authorized admin
 *    context. This call returns IShoppingMallAdmin.IAuthorized and configures
 *    the Authorization header on the connection automatically using the
 *    returned token.
 * 2. Construct a random policyCode string with a recognizable prefix (e.g.,
 *    "nonexistent_" + RandomGenerator.alphaNumeric(24)) to minimize the chance
 *    of colliding with a real policy. Do not create any policy with this code
 *    (no such creation API is available in this test scope).
 * 3. Optionally attempt to GET /shoppingMall/admin/businessPolicies/{policyCode}
 *    for this code and validate that it fails with an HTTP error using
 *    TestValidator.httpError. This confirms the code is not mapped to a real
 *    policy before deletion.
 * 4. Call DELETE /shoppingMall/admin/businessPolicies/{policyCode} with the same
 *    non-existent policyCode and assert, via TestValidator.httpError, that the
 *    operation fails with a client error status (typically 404 Not Found or 409
 *    Conflict). We do not need to inspect the error payload; the presence of an
 *    HttpError with the expected status is sufficient.
 * 5. Optionally call GET again for the same policyCode and validate via
 *    TestValidator.httpError that the policy is still not found, confirming
 *    that the delete attempt did not create or resurrect the policy as a side
 *    effect.
 */
export async function test_api_business_policy_delete_nonexistent_policy_code(
  connection: api.IConnection,
) {
  // 1. Admin join to obtain authorized context.
  const joinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(admin);

  // 2. Choose a highly unlikely policyCode.
  const policyCodePrefix = "nonexistent_policy_";
  const policyCodeSuffix = RandomGenerator.alphaNumeric(24);
  const policyCode = `${policyCodePrefix}${policyCodeSuffix}`;

  // 3. Optional pre-check: GET with non-existent policyCode should error.
  await TestValidator.httpError(
    "pre-check: get non-existent policy must fail",
    404,
    async () => {
      return await api.functional.shoppingMall.admin.businessPolicies.at(
        connection,
        {
          policyCode,
        },
      );
    },
  );

  // 4. DELETE non-existent policy and expect an HTTP error.
  await TestValidator.httpError(
    "delete non-existent policy must return not-found or equivalent error",
    [404, 409],
    async () => {
      return await api.functional.shoppingMall.admin.businessPolicies.erase(
        connection,
        {
          policyCode,
        },
      );
    },
  );

  // 5. Post-check: GET should still error for the same policyCode, proving
  //    delete did not create or resurrect a policy.
  await TestValidator.httpError(
    "post-check: get non-existent policy still fails after delete attempt",
    404,
    async () => {
      return await api.functional.shoppingMall.admin.businessPolicies.at(
        connection,
        {
          policyCode,
        },
      );
    },
  );
}
