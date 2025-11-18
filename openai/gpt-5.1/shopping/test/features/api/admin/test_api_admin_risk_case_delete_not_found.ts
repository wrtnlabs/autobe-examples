import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";

/**
 * Validate not-found deletion behavior for risk cases by an authenticated
 * admin.
 *
 * Business purpose:
 *
 * - Ensure that the administrative DELETE
 *   /shoppingMall/admin/riskCases/{riskCaseCode} endpoint does not silently
 *   succeed when the target risk case does not exist.
 * - Confirm that only an authenticated admin can attempt this action and that the
 *   platform surfaces an error when the riskCaseCode cannot be found.
 *
 * High level flow:
 *
 * 1. Join as an admin via POST /auth/admin/join to obtain an authenticated
 *    context.
 * 2. Generate a random riskCaseCode value that is extremely unlikely to exist.
 * 3. Call DELETE /shoppingMall/admin/riskCases/{riskCaseCode} with that code.
 * 4. Assert that the operation fails (e.g., not-found / business error) instead of
 *    succeeding like a normal deletion.
 *
 * Constraints from testing framework and SDK:
 *
 * - Use api.functional.auth.admin.join for admin registration/authentication.
 * - Use api.functional.shoppingMall.admin.riskCases.erase for deletion.
 * - Do not manually manipulate connection.headers; the SDK handles tokens.
 * - Use TestValidator.error to assert that an error is thrown, but do NOT assert
 *   on specific HTTP status codes.
 * - All request bodies must satisfy their DTO types; no type-error scenarios.
 */
export async function test_api_admin_risk_case_delete_not_found(
  connection: api.IConnection,
) {
  // 1. Join as an admin to obtain authenticated context
  const adminInput = typia.random<IShoppingMallAdminJoin.ICreate>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminInput,
    });
  typia.assert(admin);

  // 2. Generate a random, almost certainly non-existent riskCaseCode
  const nonexistentRiskCaseCode: string = RandomGenerator.alphaNumeric(32);

  // 3. Attempt to delete the non-existent risk case as admin
  await TestValidator.error(
    "deleting non-existent risk case should fail",
    async () => {
      await api.functional.shoppingMall.admin.riskCases.erase(connection, {
        riskCaseCode: nonexistentRiskCaseCode,
      });
    },
  );
}
