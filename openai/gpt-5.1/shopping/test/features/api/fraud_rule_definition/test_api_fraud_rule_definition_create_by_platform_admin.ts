import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallFraudRuleDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFraudRuleDefinition";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate that a platform administrator can create a fraud rule definition.
 *
 * Business context:
 *
 * - Only platform administrators are allowed to register new fraud rules that the
 *   risk engine evaluates for future transactions.
 * - Each rule is identified by a stable business `ruleCode` and contains metadata
 *   such as name, scope, severity, activation flag and a serialized rule
 *   expression.
 *
 * Steps:
 *
 * 1. Join as a new platform admin using POST /auth/platformAdmin/join.
 * 2. Confirm the join response is a valid authorized admin session.
 * 3. Build a realistic IShoppingMallFraudRuleDefinition.ICreate payload.
 * 4. Call POST /shoppingMall/platformAdmin/fraudRuleDefinitions to create the
 *    rule.
 * 5. Validate that the returned IShoppingMallFraudRuleDefinition mirrors the
 *    request where appropriate and has system-managed fields populated.
 */
export async function test_api_fraud_rule_definition_create_by_platform_admin(
  connection: api.IConnection,
) {
  // 1. Join as a new platform admin (authentication bootstrap)
  const joinRequestBody = {
    email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    // use valid URI formats for href and referrer
    href: "https://admin.example.com/signup",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinRequestBody,
    });
  typia.assert(admin);

  // Basic business checks on authorized admin session
  TestValidator.predicate(
    "platform admin account must be active after join",
    admin.isActive === true,
  );
  TestValidator.equals(
    "platform admin email in session matches join request",
    admin.email,
    joinRequestBody.email,
  );

  // 2. Construct a valid fraud rule definition create payload
  const uniqueSuffix: string = RandomGenerator.alphaNumeric(8);
  const ruleCode: string = `FRAUD_RULE_${uniqueSuffix}`;

  const createBody = {
    ruleCode,
    name: `High value payment risk ${uniqueSuffix}`,
    description: RandomGenerator.paragraph({
      sentences: 6,
      wordMin: 4,
      wordMax: 10,
    }),
    scope: "payment",
    severity: "high",
    ruleExpression: JSON.stringify({
      type: "threshold",
      field: "payment.amount",
      operator: ">",
      value: 100000,
      currency: "KRW",
    }),
    isEnabled: true,
  } satisfies IShoppingMallFraudRuleDefinition.ICreate;

  // 3. Create the fraud rule definition as platform admin
  const createdRule: IShoppingMallFraudRuleDefinition =
    await api.functional.shoppingMall.platformAdmin.fraudRuleDefinitions.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(createdRule);

  // 4. Business assertions on created rule

  // Ensure id is a non-empty UUID string (type already validated by typia)
  TestValidator.predicate(
    "created fraud rule id must be a non-empty string",
    typeof createdRule.id === "string" && createdRule.id.length > 0,
  );

  // Check stable business identifier mapping
  TestValidator.equals(
    "ruleCode in response matches request",
    createdRule.ruleCode,
    createBody.ruleCode,
  );

  // Name, scope, severity, isEnabled should mirror the request
  TestValidator.equals(
    "rule name in response matches request",
    createdRule.name,
    createBody.name,
  );
  TestValidator.equals(
    "scope in response matches request",
    createdRule.scope,
    createBody.scope,
  );
  TestValidator.equals(
    "severity in response matches request",
    createdRule.severity,
    createBody.severity,
  );
  TestValidator.equals(
    "isEnabled flag in response matches request",
    createdRule.isEnabled,
    createBody.isEnabled,
  );

  // Description is optional in DTO, but provided here and should be echoed back
  TestValidator.equals(
    "description in response matches request when provided",
    createdRule.description,
    createBody.description,
  );

  // ruleExpression in create maps to condition in the persisted entity
  TestValidator.equals(
    "persisted condition matches ruleExpression from create payload",
    createdRule.condition,
    createBody.ruleExpression,
  );

  // System-managed timestamps must be populated and initially equal
  TestValidator.predicate(
    "createdAt timestamp must be a non-empty string",
    typeof createdRule.createdAt === "string" &&
      createdRule.createdAt.length > 0,
  );
  TestValidator.predicate(
    "updatedAt timestamp must be a non-empty string",
    typeof createdRule.updatedAt === "string" &&
      createdRule.updatedAt.length > 0,
  );

  TestValidator.equals(
    "createdAt and updatedAt should be equal immediately after creation",
    createdRule.createdAt,
    createdRule.updatedAt,
  );
}
