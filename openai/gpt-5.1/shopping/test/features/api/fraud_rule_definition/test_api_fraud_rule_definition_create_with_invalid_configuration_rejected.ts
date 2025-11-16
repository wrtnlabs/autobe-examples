import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallFraudRuleDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFraudRuleDefinition";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Verify that creating fraud rule definitions with invalid configuration is
 * rejected by the backend even when DTO types are correct.
 *
 * Business goal:
 *
 * - Ensure that the fraud rule engine validation runs on create and rejects
 *   clearly malformed or unsupported configurations rather than accepting
 *   arbitrary strings that would break later.
 *
 * Scenario steps
 *
 * 1. Join as a platform admin using POST /auth/platformAdmin/join.
 * 2. Attempt to create a fraud rule definition with an invalid ruleExpression that
 *    should fail business validation.
 * 3. Attempt to create a fraud rule definition with an unsupported severity value
 *    that should also fail business validation.
 * 4. Optionally create a valid fraud rule definition to confirm the happy path
 *    still works and validate basic invariants.
 */
export async function test_api_fraud_rule_definition_create_with_invalid_configuration_rejected(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform admin
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: RandomGenerator.mobile("192.168"),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Negative case: invalid ruleExpression content
  const invalidExpressionRule = {
    ruleCode: `INVALID_EXPR_${RandomGenerator.alphaNumeric(8)}`,
    name: "Invalid expression rule",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    scope: "order",
    severity: "high",
    ruleExpression: JSON.stringify({
      // Invalid engine-specific content: clearly unknown field and operator
      condition: "order.nonExistingField >>> 1000",
    }),
    isEnabled: true,
  } satisfies IShoppingMallFraudRuleDefinition.ICreate;

  await TestValidator.error(
    "fraud rule creation with invalid ruleExpression should fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.fraudRuleDefinitions.create(
        connection,
        { body: invalidExpressionRule },
      );
    },
  );

  // 3. Negative case: unsupported severity value
  const unsupportedSeverityRule = {
    ruleCode: `INVALID_SEVERITY_${RandomGenerator.alphaNumeric(8)}`,
    name: "Unsupported severity rule",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    scope: "payment",
    // Business layer is expected to constrain severity to allowed values,
    // but we keep the type as string and violate only business rules.
    severity: "ultra_critical",
    ruleExpression: JSON.stringify({
      condition: "order.totalAmount > 100000",
    }),
    isEnabled: true,
  } satisfies IShoppingMallFraudRuleDefinition.ICreate;

  await TestValidator.error(
    "fraud rule creation with unsupported severity should fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.fraudRuleDefinitions.create(
        connection,
        { body: unsupportedSeverityRule },
      );
    },
  );

  // 4. Control case: create a valid fraud rule definition
  const validRuleBody = {
    ruleCode: `VALID_${RandomGenerator.alphaNumeric(8)}`,
    name: "High order amount",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    scope: "order",
    severity: "high",
    ruleExpression: JSON.stringify({
      condition: "order.totalAmount > 500000",
    }),
    isEnabled: true,
  } satisfies IShoppingMallFraudRuleDefinition.ICreate;

  const createdRule: IShoppingMallFraudRuleDefinition =
    await api.functional.shoppingMall.platformAdmin.fraudRuleDefinitions.create(
      connection,
      { body: validRuleBody },
    );
  typia.assert(createdRule);

  // Validate basic invariants between request and response
  TestValidator.equals(
    "created ruleCode should match requested ruleCode",
    createdRule.ruleCode,
    validRuleBody.ruleCode,
  );
  TestValidator.equals(
    "created name should match requested name",
    createdRule.name,
    validRuleBody.name,
  );
  TestValidator.equals(
    "created severity should match requested severity",
    createdRule.severity,
    validRuleBody.severity,
  );
  TestValidator.equals(
    "created scope should match requested scope",
    createdRule.scope,
    validRuleBody.scope,
  );

  TestValidator.predicate(
    "created rule should be enabled",
    createdRule.isEnabled === true,
  );
}
