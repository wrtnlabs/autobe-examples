import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallFraudRuleDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFraudRuleDefinition";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

export async function test_api_fraud_rule_definition_create_with_minimal_vs_full_payload(
  connection: api.IConnection,
) {
  // 1. Bootstrap and authenticate a platform admin via join
  const joinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/onboarding",
    referrer: "https://admin.example.com/login",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create minimal fraud rule definition (only required fields)
  const minimalCreateBody = {
    ruleCode: `MIN_RULE_${RandomGenerator.alphaNumeric(8)}`,
    name: "Minimal fraud rule",
    scope: "order",
    severity: "medium",
    ruleExpression: JSON.stringify({
      type: "threshold",
      field: "order.totalAmount",
      operator: ">",
      value: 100000,
    }),
    isEnabled: true,
  } satisfies IShoppingMallFraudRuleDefinition.ICreate;

  const minimalRule: IShoppingMallFraudRuleDefinition =
    await api.functional.shoppingMall.platformAdmin.fraudRuleDefinitions.create(
      connection,
      {
        body: minimalCreateBody,
      },
    );
  typia.assert(minimalRule);

  // Validate minimal rule core field mapping
  TestValidator.equals(
    "minimal ruleCode should echo request",
    minimalRule.ruleCode,
    minimalCreateBody.ruleCode,
  );
  TestValidator.equals(
    "minimal name should echo request",
    minimalRule.name,
    minimalCreateBody.name,
  );
  TestValidator.equals(
    "minimal scope should echo request",
    minimalRule.scope,
    minimalCreateBody.scope,
  );
  TestValidator.equals(
    "minimal severity should echo request",
    minimalRule.severity,
    minimalCreateBody.severity,
  );
  TestValidator.equals(
    "minimal isEnabled should echo request",
    minimalRule.isEnabled,
    minimalCreateBody.isEnabled,
  );
  TestValidator.equals(
    "minimal condition should be based on ruleExpression",
    minimalRule.condition,
    minimalCreateBody.ruleExpression,
  );
  TestValidator.equals(
    "minimal description should be undefined when omitted",
    minimalRule.description,
    undefined,
  );

  // 3. Create full fraud rule definition (required + optional description)
  const fullCreateBody = {
    ruleCode: `FULL_RULE_${RandomGenerator.alphaNumeric(8)}`,
    name: "Full fraud rule",
    scope: "payment",
    severity: "high",
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 10,
    }),
    ruleExpression: JSON.stringify({
      type: "composite",
      allOf: [
        {
          type: "threshold",
          field: "payment.chargebackRate",
          operator: ">",
          value: 0.05,
        },
        {
          type: "threshold",
          field: "customer.accountAgeDays",
          operator: "<",
          value: 30,
        },
      ],
    }),
    isEnabled: true,
  } satisfies IShoppingMallFraudRuleDefinition.ICreate;

  const fullRule: IShoppingMallFraudRuleDefinition =
    await api.functional.shoppingMall.platformAdmin.fraudRuleDefinitions.create(
      connection,
      {
        body: fullCreateBody,
      },
    );
  typia.assert(fullRule);

  // Validate full rule core and optional field mapping
  TestValidator.equals(
    "full ruleCode should echo request",
    fullRule.ruleCode,
    fullCreateBody.ruleCode,
  );
  TestValidator.equals(
    "full name should echo request",
    fullRule.name,
    fullCreateBody.name,
  );
  TestValidator.equals(
    "full scope should echo request",
    fullRule.scope,
    fullCreateBody.scope,
  );
  TestValidator.equals(
    "full severity should echo request",
    fullRule.severity,
    fullCreateBody.severity,
  );
  TestValidator.equals(
    "full isEnabled should echo request",
    fullRule.isEnabled,
    fullCreateBody.isEnabled,
  );
  TestValidator.equals(
    "full condition should be based on ruleExpression",
    fullRule.condition,
    fullCreateBody.ruleExpression,
  );
  TestValidator.equals(
    "full description should echo request",
    fullRule.description,
    fullCreateBody.description,
  );

  // 4. Cross-scenario comparisons
  TestValidator.notEquals(
    "minimal and full rules must have different ids",
    minimalRule.id,
    fullRule.id,
  );
  TestValidator.notEquals(
    "minimal and full rules must have different ruleCode",
    minimalRule.ruleCode,
    fullRule.ruleCode,
  );

  // Ensure timestamps exist (typia already validated their format)
  TestValidator.predicate(
    "minimal createdAt should be non-empty string",
    minimalRule.createdAt.length > 0,
  );
  TestValidator.predicate(
    "full createdAt should be non-empty string",
    fullRule.createdAt.length > 0,
  );
}
