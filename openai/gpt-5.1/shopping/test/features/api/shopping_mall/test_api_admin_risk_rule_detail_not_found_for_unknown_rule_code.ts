import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallRiskRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskRule";

/**
 * Validate that requesting a risk rule detail with an unknown ruleCode results
 * in an error.
 *
 * Business goal:
 *
 * - When an admin calls GET /shoppingMall/admin/riskRules/{ruleCode} with a
 *   ruleCode that does not exist in shopping_mall_risk_rules, the API must fail
 *   (typically with a 404-style not-found error) instead of returning a
 *   successful response with an empty or dummy payload.
 *
 * Test workflow:
 *
 * 1. Join as an admin via POST /auth/admin/join to obtain an authenticated admin
 *    context.
 * 2. Construct a clearly non-existent ruleCode string.
 * 3. Call GET /shoppingMall/admin/riskRules/{ruleCode} with that unknown ruleCode
 *    inside TestValidator.error.
 * 4. Assert that the call throws an error rather than returning an
 *    IShoppingMallRiskRule.
 */
export async function test_api_admin_risk_rule_detail_not_found_for_unknown_rule_code(
  connection: api.IConnection,
) {
  // 1. Bootstrap an admin account and authenticate via join
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Prepare a clearly non-existent ruleCode for lookup
  const nonExistentRuleCode =
    "nonexistent_rule_code_for_test_" + RandomGenerator.alphaNumeric(16);

  // 3. Call the risk rule detail endpoint expecting a not-found style error
  await TestValidator.error(
    "unknown risk rule code should result in not-found style error",
    async () => {
      await api.functional.shoppingMall.admin.riskRules.at(connection, {
        ruleCode: nonExistentRuleCode,
      });
    },
  );
}
