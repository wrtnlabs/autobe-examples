import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallFraudRuleDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFraudRuleDefinition";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

export async function test_api_fraud_rule_definition_create_with_duplicate_rule_code(
  connection: api.IConnection,
) {
  // 1. Join as a platform admin to obtain an authorized connection
  const joinBody = {
    email: `fraud-admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Create an initial fraud rule definition with a fixed ruleCode
  const ruleCode = "RULE_DUPLICATE_TEST";

  const firstRuleBody = {
    ruleCode,
    name: "Duplicate Rule Code Test #1",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    scope: "order",
    severity: "high",
    ruleExpression: JSON.stringify({
      type: "threshold",
      field: "order.amount",
      operator: ">",
      value: 100000,
    }),
    isEnabled: true,
  } satisfies IShoppingMallFraudRuleDefinition.ICreate;

  const firstRule: IShoppingMallFraudRuleDefinition =
    await api.functional.shoppingMall.platformAdmin.fraudRuleDefinitions.create(
      connection,
      {
        body: firstRuleBody,
      },
    );
  typia.assert<IShoppingMallFraudRuleDefinition>(firstRule);

  // Basic business validations for the first rule
  TestValidator.equals(
    "first ruleCode should match the requested ruleCode",
    firstRule.ruleCode,
    ruleCode,
  );
  TestValidator.equals(
    "first rule should be enabled as requested",
    firstRule.isEnabled,
    true,
  );
  TestValidator.equals(
    "first rule severity should be 'high'",
    firstRule.severity,
    "high",
  );

  // 3. Attempt to create a second fraud rule with the same ruleCode but different metadata
  const secondRuleBody = {
    ruleCode,
    name: "Duplicate Rule Code Test #2", // changed name
    description: RandomGenerator.paragraph({ sentences: 3 }), // changed description
    scope: "order", // same scope
    severity: "critical", // changed severity
    ruleExpression: JSON.stringify({
      type: "threshold",
      field: "order.refundRate",
      operator: ">",
      value: 0.5,
    }),
    isEnabled: false,
  } satisfies IShoppingMallFraudRuleDefinition.ICreate;

  await TestValidator.error(
    "creating a fraud rule with duplicate ruleCode must fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.fraudRuleDefinitions.create(
        connection,
        {
          body: secondRuleBody,
        },
      );
    },
  );

  // 4. Sanity check that original rule remained as created (based on in-memory data)
  TestValidator.equals(
    "original rule remains enabled after duplicate attempt",
    firstRule.isEnabled,
    true,
  );
}
