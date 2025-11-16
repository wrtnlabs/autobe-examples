import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallFraudRuleDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFraudRuleDefinition";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

export async function test_api_fraud_rule_definition_detail_by_platform_admin(
  connection: api.IConnection,
) {
  // 1. Register a new platform admin and obtain authenticated session
  const joinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Create an enabled fraud rule definition with description
  const enabledRuleCode = `RULE_${RandomGenerator.alphaNumeric(12)}`;
  const enabledCreateBody = {
    ruleCode: enabledRuleCode,
    name: `Enabled rule ${RandomGenerator.name(2)}`,
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
      field: "orderAmount",
      operator: ">",
      threshold: 100000,
    }),
    isEnabled: true,
  } satisfies IShoppingMallFraudRuleDefinition.ICreate;

  const enabledCreated: IShoppingMallFraudRuleDefinition =
    await api.functional.shoppingMall.platformAdmin.fraudRuleDefinitions.create(
      connection,
      {
        body: enabledCreateBody,
      },
    );
  typia.assert<IShoppingMallFraudRuleDefinition>(enabledCreated);

  // 3. Fetch detail of the enabled rule by ruleCode
  const enabledFetched: IShoppingMallFraudRuleDefinition =
    await api.functional.shoppingMall.platformAdmin.fraudRuleDefinitions.at(
      connection,
      {
        ruleCode: enabledRuleCode,
      },
    );
  typia.assert<IShoppingMallFraudRuleDefinition>(enabledFetched);

  // 4. Validate that created and fetched enabled rule match in key fields
  TestValidator.equals(
    "enabled rule: id must match between create and detail",
    enabledFetched.id,
    enabledCreated.id,
  );
  TestValidator.equals(
    "enabled rule: ruleCode must match between create and detail",
    enabledFetched.ruleCode,
    enabledCreated.ruleCode,
  );
  TestValidator.equals(
    "enabled rule: name must match between create and detail",
    enabledFetched.name,
    enabledCreateBody.name,
  );
  TestValidator.equals(
    "enabled rule: scope must match between create and detail",
    enabledFetched.scope,
    enabledCreateBody.scope,
  );
  TestValidator.equals(
    "enabled rule: severity must match between create and detail",
    enabledFetched.severity,
    enabledCreateBody.severity,
  );
  TestValidator.equals(
    "enabled rule: isEnabled must match between create and detail",
    enabledFetched.isEnabled,
    enabledCreateBody.isEnabled,
  );
  // condition is mapped from ruleExpression in create DTO
  TestValidator.equals(
    "enabled rule: condition must reflect ruleExpression from create body",
    enabledFetched.condition,
    enabledCreateBody.ruleExpression,
  );
  TestValidator.equals(
    "enabled rule: description must be preserved when provided",
    enabledFetched.description,
    enabledCreateBody.description,
  );
  TestValidator.equals(
    "enabled rule: category should be undefined when not provided in create body",
    enabledFetched.category,
    undefined,
  );

  await TestValidator.predicate(
    "enabled rule: createdAt and updatedAt must be valid ISO date-time strings",
    async () => {
      const createdTime = new Date(enabledFetched.createdAt).getTime();
      const updatedTime = new Date(enabledFetched.updatedAt).getTime();
      return Number.isFinite(createdTime) && Number.isFinite(updatedTime);
    },
  );
  await TestValidator.predicate(
    "enabled rule: updatedAt must be greater than or equal to createdAt",
    async () => {
      const createdTime = new Date(enabledFetched.createdAt).getTime();
      const updatedTime = new Date(enabledFetched.updatedAt).getTime();
      return updatedTime >= createdTime;
    },
  );

  // 5. Create a disabled fraud rule to ensure inactive rules are also returned
  const disabledRuleCode = `RULE_${RandomGenerator.alphaNumeric(12)}`;
  const disabledCreateBody = {
    ruleCode: disabledRuleCode,
    name: `Disabled rule ${RandomGenerator.name(2)}`,
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
      field: "refundRate",
      operator: ">=",
      threshold: 0.5,
    }),
    isEnabled: false,
  } satisfies IShoppingMallFraudRuleDefinition.ICreate;

  const disabledCreated: IShoppingMallFraudRuleDefinition =
    await api.functional.shoppingMall.platformAdmin.fraudRuleDefinitions.create(
      connection,
      {
        body: disabledCreateBody,
      },
    );
  typia.assert<IShoppingMallFraudRuleDefinition>(disabledCreated);

  // 6. Fetch detail of the disabled rule by ruleCode and validate
  const disabledFetched: IShoppingMallFraudRuleDefinition =
    await api.functional.shoppingMall.platformAdmin.fraudRuleDefinitions.at(
      connection,
      {
        ruleCode: disabledRuleCode,
      },
    );
  typia.assert<IShoppingMallFraudRuleDefinition>(disabledFetched);

  TestValidator.equals(
    "disabled rule: isEnabled=false rules must still be retrievable",
    disabledFetched.isEnabled,
    false,
  );
  TestValidator.equals(
    "disabled rule: id must match between create and detail",
    disabledFetched.id,
    disabledCreated.id,
  );
  TestValidator.equals(
    "disabled rule: ruleCode must match between create and detail",
    disabledFetched.ruleCode,
    disabledCreated.ruleCode,
  );
  TestValidator.equals(
    "disabled rule: name must match between create and detail",
    disabledFetched.name,
    disabledCreateBody.name,
  );
  TestValidator.equals(
    "disabled rule: scope must match between create and detail",
    disabledFetched.scope,
    disabledCreateBody.scope,
  );
  TestValidator.equals(
    "disabled rule: severity must match between create and detail",
    disabledFetched.severity,
    disabledCreateBody.severity,
  );
  TestValidator.equals(
    "disabled rule: condition must reflect ruleExpression from create body",
    disabledFetched.condition,
    disabledCreateBody.ruleExpression,
  );

  await TestValidator.predicate(
    "disabled rule: createdAt and updatedAt must be valid ISO date-time strings",
    async () => {
      const createdTime = new Date(disabledFetched.createdAt).getTime();
      const updatedTime = new Date(disabledFetched.updatedAt).getTime();
      return Number.isFinite(createdTime) && Number.isFinite(updatedTime);
    },
  );
  await TestValidator.predicate(
    "disabled rule: updatedAt must be greater than or equal to createdAt",
    async () => {
      const createdTime = new Date(disabledFetched.createdAt).getTime();
      const updatedTime = new Date(disabledFetched.updatedAt).getTime();
      return updatedTime >= createdTime;
    },
  );
}
