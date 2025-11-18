import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallRiskRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskRule";

/**
 * Validate creation of a disabled risk rule by an authenticated admin.
 *
 * Business goal: Ensure that the admin risk-rules creation API allows an
 * administrator to create a rule with `is_enabled = false`, keeping it stored
 * but inactive so that risk configuration can be staged or drafted without
 * immediately taking effect in the risk engine.
 *
 * Test flow:
 *
 * 1. Join an admin account using POST /auth/admin/join to obtain an authenticated
 *    administrator context. The SDK will automatically inject the returned
 *    access token into the connection headers.
 * 2. Using this authenticated connection, call POST /shoppingMall/admin/riskRules
 *    with a fully populated IShoppingMallRiskRule.ICreate body where:
 *
 *    - All required fields (rule_code, name, scope, severity, expression_json,
 *         is_enabled) are valid.
 *    - Optional documentation/metadata fields (description, applies_to_countries,
 *         effective_from, effective_until) are set to realistic values or
 *         null.
 *    - Critically, `is_enabled` is explicitly set to false to express a
 *         drafted/inactive rule.
 * 3. Verify that the API call succeeds and returns an IShoppingMallRiskRule
 *    instance.
 * 4. Use typia.assert to guarantee the runtime shape of the response matches
 *    IShoppingMallRiskRule.
 * 5. Validate core business expectations with TestValidator:
 *
 *    - The returned rule has `is_enabled === false`, proving the API does not
 *         automatically force rules to be active when created.
 *    - The `deleted_at` field is null or undefined, confirming the rule is not
 *         logically retired upon creation.
 *    - Key configuration fields such as rule_code, name, scope, severity, and
 *         expression_json match the request body, showing that the
 *         configuration is stored as requested.
 *
 * This test demonstrates that the platform supports drafting risk rules in a
 * disabled state, enabling governance and risk teams to configure rules ahead
 * of activation without affecting live risk evaluation.
 */
export async function test_api_admin_risk_rule_creation_with_disabled_flag(
  connection: api.IConnection,
) {
  // 1. Register an admin and obtain an authenticated context.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Prepare a disabled IShoppingMallRiskRule.ICreate payload.
  const nowIso: string & tags.Format<"date-time"> = typia.random<
    string & tags.Format<"date-time">
  >();

  const createBody = {
    rule_code: `draft_rule_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    scope: "order",
    severity: "medium",
    expression_json: JSON.stringify({
      type: "threshold",
      field: "refund_rate",
      operator: ">",
      value: 0.8,
      window_days: 30,
    }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_enabled: false,
    applies_to_countries: JSON.stringify(["US", "KR"]),
    effective_from: nowIso,
    effective_until: null,
  } satisfies IShoppingMallRiskRule.ICreate;

  // 3. Create the risk rule via admin API.
  const createdRule: IShoppingMallRiskRule =
    await api.functional.shoppingMall.admin.riskRules.create(connection, {
      body: createBody,
    });
  typia.assert(createdRule);

  // 4. Business validations.
  TestValidator.equals(
    "created rule_code should match request",
    createdRule.rule_code,
    createBody.rule_code,
  );
  TestValidator.equals(
    "created name should match request",
    createdRule.name,
    createBody.name,
  );
  TestValidator.equals(
    "created scope should match request",
    createdRule.scope,
    createBody.scope,
  );
  TestValidator.equals(
    "created severity should match request",
    createdRule.severity,
    createBody.severity,
  );
  TestValidator.equals(
    "created expression_json should match request",
    createdRule.expression_json,
    createBody.expression_json,
  );

  // is_enabled must remain false as explicitly requested.
  TestValidator.equals(
    "created rule must be disabled (is_enabled=false)",
    createdRule.is_enabled,
    false,
  );

  // deleted_at should be null or undefined for a freshly created rule.
  TestValidator.equals(
    "deleted_at should be null on newly created rule",
    createdRule.deleted_at ?? null,
    null,
  );
}
