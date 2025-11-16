import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallFraudRuleDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFraudRuleDefinition";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Toggle the activation flag of a fraud rule definition as a platform admin.
 *
 * This E2E test verifies that a platform administrator can enable and disable a
 * fraud rule definition using the update endpoint addressed by its business key
 * `ruleCode`, and that changing the `isEnabled` flag does not unintentionally
 * alter any other attributes of the rule.
 *
 * High-level flow:
 *
 * 1. Register a platform administrator (join) so subsequent calls are authorized
 *    as `platformAdmin`.
 * 2. Create a fraud rule definition with `isEnabled=false`.
 * 3. Update the same rule (by `ruleCode`) with an `IUpdate` payload that only sets
 *    `isEnabled=true`.
 * 4. Validate that only the enable flag has changed and all other fields are
 *    preserved.
 * 5. Optionally toggle back to `isEnabled=false` and validate again.
 */
export async function test_api_fraud_rule_definition_update_toggle_enable_flag(
  connection: api.IConnection,
) {
  // 1. Register a platform admin so that the connection carries admin auth.
  const joinRequest = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinRequest,
    });
  typia.assert(platformAdmin);

  // 2. Create a fraud rule definition initially disabled.
  const ruleCode = `RULE_${RandomGenerator.alphaNumeric(10)}`;

  const createBody = {
    ruleCode,
    name: `Fraud rule ${RandomGenerator.alphabets(6)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    scope: RandomGenerator.pick([
      "order",
      "payment",
      "customer_account",
      "seller_account",
      "session_activity",
    ] as const),
    severity: RandomGenerator.pick([
      "low",
      "medium",
      "high",
      "critical",
    ] as const),
    ruleExpression: JSON.stringify({
      thresholdAmount: 100000,
      windowMinutes: 60,
      action: "flag",
    }),
    isEnabled: false,
  } satisfies IShoppingMallFraudRuleDefinition.ICreate;

  const createdRule: IShoppingMallFraudRuleDefinition =
    await api.functional.shoppingMall.platformAdmin.fraudRuleDefinitions.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(createdRule);

  // Sanity checks on initial created rule.
  TestValidator.equals(
    "created ruleCode matches request",
    createdRule.ruleCode,
    ruleCode,
  );
  TestValidator.equals(
    "created isEnabled should be false",
    createdRule.isEnabled,
    false,
  );

  // 3. Enable the rule via update using only isEnabled field.
  const enableBody = {
    isEnabled: true,
  } satisfies IShoppingMallFraudRuleDefinition.IUpdate;

  const enabledRule: IShoppingMallFraudRuleDefinition =
    await api.functional.shoppingMall.platformAdmin.fraudRuleDefinitions.update(
      connection,
      {
        ruleCode: createdRule.ruleCode,
        body: enableBody,
      },
    );
  typia.assert(enabledRule);

  // 4. Validate that only the flag changed and other attributes remain.
  TestValidator.equals(
    "ruleCode remains unchanged after enabling",
    enabledRule.ruleCode,
    createdRule.ruleCode,
  );
  TestValidator.equals(
    "name remains unchanged after enabling",
    enabledRule.name,
    createdRule.name,
  );
  TestValidator.equals(
    "scope remains unchanged after enabling",
    enabledRule.scope,
    createdRule.scope,
  );
  TestValidator.equals(
    "severity remains unchanged after enabling",
    enabledRule.severity,
    createdRule.severity,
  );
  TestValidator.equals(
    "condition/ruleExpression remains unchanged after enabling",
    enabledRule.condition,
    createdRule.condition,
  );

  TestValidator.equals(
    "isEnabled is true after enabling",
    enabledRule.isEnabled,
    true,
  );
  TestValidator.notEquals(
    "isEnabled changed from false to true",
    enabledRule.isEnabled,
    createdRule.isEnabled,
  );

  // updatedAt should not be earlier than createdAt.
  TestValidator.predicate("updatedAt is not earlier than createdAt", () => {
    const createdAt = new Date(createdRule.createdAt).getTime();
    const updatedAt = new Date(enabledRule.updatedAt).getTime();
    return updatedAt >= createdAt;
  });

  // 5. Optionally toggle back to disabled and validate again.
  const disableBody = {
    isEnabled: false,
  } satisfies IShoppingMallFraudRuleDefinition.IUpdate;

  const disabledRule: IShoppingMallFraudRuleDefinition =
    await api.functional.shoppingMall.platformAdmin.fraudRuleDefinitions.update(
      connection,
      {
        ruleCode: createdRule.ruleCode,
        body: disableBody,
      },
    );
  typia.assert(disabledRule);

  TestValidator.equals(
    "ruleCode remains unchanged after disabling",
    disabledRule.ruleCode,
    createdRule.ruleCode,
  );
  TestValidator.equals(
    "name remains unchanged after disabling",
    disabledRule.name,
    createdRule.name,
  );
  TestValidator.equals(
    "scope remains unchanged after disabling",
    disabledRule.scope,
    createdRule.scope,
  );
  TestValidator.equals(
    "severity remains unchanged after disabling",
    disabledRule.severity,
    createdRule.severity,
  );
  TestValidator.equals(
    "condition/ruleExpression remains unchanged after disabling",
    disabledRule.condition,
    createdRule.condition,
  );
  TestValidator.equals(
    "isEnabled is false after disabling",
    disabledRule.isEnabled,
    false,
  );
}
