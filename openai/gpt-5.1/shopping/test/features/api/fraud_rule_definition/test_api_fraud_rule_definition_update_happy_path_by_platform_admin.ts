import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallFraudRuleDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFraudRuleDefinition";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate that a platform administrator can successfully update an existing
 * fraud rule definition.
 *
 * Business flow:
 *
 * 1. Register a new platform admin via POST /auth/platformAdmin/join and establish
 *    an authenticated session
 * 2. Create an initial fraud rule definition via POST
 *    /shoppingMall/platformAdmin/fraudRuleDefinitions
 * 3. Update several mutable fields of that fraud rule definition via PUT
 *    /shoppingMall/platformAdmin/fraudRuleDefinitions/{ruleCode}
 * 4. Verify that immutable fields (id, ruleCode, createdAt) remain unchanged
 * 5. Verify that mutable fields (name, description, scope, severity,
 *    ruleExpression/condition, isEnabled) reflect the update payload
 * 6. Verify that updatedAt changes after the update
 */
export async function test_api_fraud_rule_definition_update_happy_path_by_platform_admin(
  connection: api.IConnection,
) {
  // 1. Platform admin joins and becomes authenticated
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphabets(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create an initial fraud rule definition
  const scopes = [
    "order",
    "payment",
    "customer_account",
    "seller_account",
    "session_activity",
  ] as const;
  const severities = ["low", "medium", "high", "critical"] as const;

  const createBody = {
    ruleCode: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    scope: RandomGenerator.pick(scopes),
    severity: RandomGenerator.pick(severities),
    ruleExpression: RandomGenerator.content({ paragraphs: 1 }),
    isEnabled: true,
  } satisfies IShoppingMallFraudRuleDefinition.ICreate;

  const createdRule: IShoppingMallFraudRuleDefinition =
    await api.functional.shoppingMall.platformAdmin.fraudRuleDefinitions.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(createdRule);

  // Basic sanity checks on created rule
  TestValidator.equals(
    "created fraud rule ruleCode matches create payload",
    createdRule.ruleCode,
    createBody.ruleCode,
  );
  TestValidator.equals(
    "created fraud rule condition mirrors create.ruleExpression",
    createdRule.condition,
    createBody.ruleExpression,
  );
  TestValidator.equals(
    "created fraud rule isEnabled mirrors create.isEnabled",
    createdRule.isEnabled,
    createBody.isEnabled,
  );

  // 3. Update several mutable fields of the fraud rule definition
  const updatedSeverity = RandomGenerator.pick(severities);
  const updatedScope = RandomGenerator.pick(scopes);

  const updateBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    scope: updatedScope,
    severity: updatedSeverity,
    ruleExpression: RandomGenerator.content({ paragraphs: 1 }),
    isEnabled: false,
  } satisfies IShoppingMallFraudRuleDefinition.IUpdate;

  const updatedRule: IShoppingMallFraudRuleDefinition =
    await api.functional.shoppingMall.platformAdmin.fraudRuleDefinitions.update(
      connection,
      {
        ruleCode: createdRule.ruleCode,
        body: updateBody,
      },
    );
  typia.assert(updatedRule);

  // 4. Validate immutable fields remain unchanged
  TestValidator.equals(
    "fraud rule id remains unchanged after update",
    updatedRule.id,
    createdRule.id,
  );
  TestValidator.equals(
    "fraud rule ruleCode remains unchanged after update",
    updatedRule.ruleCode,
    createdRule.ruleCode,
  );
  TestValidator.equals(
    "fraud rule createdAt remains unchanged after update",
    updatedRule.createdAt,
    createdRule.createdAt,
  );

  // 5. Validate mutable fields reflect update payload
  TestValidator.equals(
    "fraud rule name updated",
    updatedRule.name,
    updateBody.name,
  );
  TestValidator.equals(
    "fraud rule description updated",
    updatedRule.description,
    updateBody.description,
  );
  TestValidator.equals(
    "fraud rule scope updated",
    updatedRule.scope,
    updateBody.scope,
  );
  TestValidator.equals(
    "fraud rule severity updated",
    updatedRule.severity,
    updateBody.severity,
  );
  TestValidator.equals(
    "fraud rule isEnabled flag updated",
    updatedRule.isEnabled,
    updateBody.isEnabled,
  );
  TestValidator.equals(
    "fraud rule condition updated to reflect ruleExpression",
    updatedRule.condition,
    updateBody.ruleExpression,
  );

  // 6. Validate updatedAt has changed
  TestValidator.predicate(
    "fraud rule updatedAt changes after update",
    updatedRule.updatedAt !== createdRule.updatedAt,
  );
}
