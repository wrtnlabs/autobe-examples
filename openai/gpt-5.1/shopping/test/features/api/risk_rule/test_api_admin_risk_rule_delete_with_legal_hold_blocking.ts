import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallRiskRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskRule";

/**
 * Validate logical retirement (soft delete) of shopping mall risk rules.
 *
 * Business intent:
 *
 * - Risk rules used by the risk engine must not be physically deleted, but
 *   retired via soft delete so that auditability and historical traceability
 *   are preserved.
 * - The DELETE /shoppingMall/admin/riskRules/{ruleCode} endpoint is documented as
 *   a logical retirement operation that sets deleted_at and disables evaluation
 *   via is_enabled=false.
 * - Legal-hold / governance constraints are conceptually modeled by this
 *   soft-delete behavior, even though explicit legal-hold APIs are not
 *   available in this test environment.
 *
 * This test exercises a realistic lifecycle flow:
 *
 * 1. Register an admin via POST /auth/admin/join to obtain an authenticated admin
 *    context and JWT tokens. The SDK automatically wires the access token into
 *    the connection headers.
 * 2. Create a new risk rule via POST /shoppingMall/admin/riskRules using a fresh,
 *    unique rule_code and a plausible configuration payload.
 * 3. Verify that the created rule is enabled and not deleted (is_enabled === true,
 *    deleted_at === null).
 * 4. Call DELETE /shoppingMall/admin/riskRules/{ruleCode} and assert that:
 *
 *    - The returned IShoppingMallRiskRule has the same rule_code as created.
 *    - Is_enabled is false, meaning the rule is no longer evaluated.
 *    - Deleted_at is non-null, indicating logical retirement.
 * 5. Call DELETE again on the same rule_code to verify idempotent behavior:
 *
 *    - The endpoint continues to return a rule with the same rule_code.
 *    - Deleted_at remains non-null.
 *    - Is_enabled remains false.
 *
 * Limitations / Scenario rewrite notes:
 *
 * - The original scenario mentioned explicit legal holds and potential HTTP 409
 *   Conflict responses. The provided SDK does not expose any legal-hold
 *   endpoints nor a GET-by-ruleCode lookup, and our tools do not support
 *   status-code-specific assertions. Therefore, this test focuses on the
 *   business-visible state transitions of the risk rule itself rather than
 *   error status semantics.
 */
export async function test_api_admin_risk_rule_delete_with_legal_hold_blocking(
  connection: api.IConnection,
) {
  // 1. Register an admin to obtain an authenticated admin context
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create a new risk rule with a unique rule_code and realistic fields
  const createBody = {
    rule_code: `test_legal_hold_${RandomGenerator.alphaNumeric(12)}`,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    scope: "account",
    severity: "high",
    expression_json: JSON.stringify({
      type: "threshold",
      field: "chargeback_rate",
      operator: ">",
      value: 0.05,
      window_days: 30,
    }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    is_enabled: true,
    applies_to_countries: JSON.stringify(["KR", "US"]),
    effective_from: new Date().toISOString(),
    effective_until: null,
  } satisfies IShoppingMallRiskRule.ICreate;

  const createdRule: IShoppingMallRiskRule =
    await api.functional.shoppingMall.admin.riskRules.create(connection, {
      body: createBody,
    });
  typia.assert<IShoppingMallRiskRule>(createdRule);

  // Validate initial state: enabled and not deleted
  TestValidator.equals(
    "created rule_code must match request payload",
    createdRule.rule_code,
    createBody.rule_code,
  );
  TestValidator.predicate(
    "created rule must be enabled initially",
    createdRule.is_enabled === true,
  );
  TestValidator.equals(
    "created rule must not be soft-deleted initially",
    createdRule.deleted_at ?? null,
    null,
  );

  // 3. Erase (logically retire) the risk rule by rule_code
  const erasedRule: IShoppingMallRiskRule =
    await api.functional.shoppingMall.admin.riskRules.erase(connection, {
      ruleCode: createdRule.rule_code,
    });
  typia.assert<IShoppingMallRiskRule>(erasedRule);

  // 4. Validate logical retirement semantics
  TestValidator.equals(
    "erased rule_code must remain stable",
    erasedRule.rule_code,
    createdRule.rule_code,
  );
  TestValidator.predicate(
    "erased rule must be disabled (is_enabled === false)",
    erasedRule.is_enabled === false,
  );
  TestValidator.predicate(
    "erased rule must have non-null deleted_at",
    erasedRule.deleted_at !== null && erasedRule.deleted_at !== undefined,
  );

  // 5. Re-erase the same rule_code to ensure idempotent soft delete semantics
  const reErasedRule: IShoppingMallRiskRule =
    await api.functional.shoppingMall.admin.riskRules.erase(connection, {
      ruleCode: createdRule.rule_code,
    });
  typia.assert<IShoppingMallRiskRule>(reErasedRule);

  TestValidator.equals(
    "re-erased rule_code must still match original",
    reErasedRule.rule_code,
    createdRule.rule_code,
  );
  TestValidator.predicate(
    "re-erased rule must remain disabled",
    reErasedRule.is_enabled === false,
  );
  TestValidator.predicate(
    "re-erased rule must still have deleted_at set",
    reErasedRule.deleted_at !== null && reErasedRule.deleted_at !== undefined,
  );
}
