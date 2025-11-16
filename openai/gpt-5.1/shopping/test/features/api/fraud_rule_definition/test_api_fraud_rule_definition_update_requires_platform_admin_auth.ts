import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallFraudRuleDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFraudRuleDefinition";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Verify that updating a fraud rule definition requires platform admin
 * authentication.
 *
 * Business flow:
 *
 * 1. Join as a platform admin using POST /auth/platformAdmin/join to obtain an
 *    authorized session.
 * 2. With this authenticated connection, create a concrete fraud rule definition
 *    via POST /shoppingMall/platformAdmin/fraudRuleDefinitions and capture its
 *    ruleCode.
 * 3. Derive an unauthenticated connection by cloning the original connection but
 *    passing an empty headers object, without further manipulating headers.
 * 4. Attempt to update the existing fraud rule definition via PUT
 *    /shoppingMall/platformAdmin/fraudRuleDefinitions/{ruleCode} using the
 *    unauthenticated connection and a minimal but valid
 *    IShoppingMallFraudRuleDefinition.IUpdate payload.
 * 5. Assert that this unauthenticated update attempt fails using
 *    TestValidator.error without checking concrete HTTP status codes.
 * 6. As a positive control, perform a successful update on the authenticated
 *    connection and assert the response structure using typia.assert().
 */
export async function test_api_fraud_rule_definition_update_requires_platform_admin_auth(
  connection: api.IConnection,
) {
  // 1. Join as platform admin to get an authorized session and token
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: RandomGenerator.alphaNumeric(8),
    href: "https://admin.shoppingmall.local/join",
    referrer: "https://shoppingmall.local/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);
  typia.assert<IAuthorizationToken>(admin.token);

  // 2. Create a fraud rule definition under authenticated platform admin context
  const createBody = {
    ruleCode: `RULE_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
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
      threshold: 3,
      windowMinutes: 30,
      condition: "refund_rate > 0.5",
    }),
    isEnabled: true,
  } satisfies IShoppingMallFraudRuleDefinition.ICreate;

  const createdRule: IShoppingMallFraudRuleDefinition =
    await api.functional.shoppingMall.platformAdmin.fraudRuleDefinitions.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert<IShoppingMallFraudRuleDefinition>(createdRule);

  // 3. Build an unauthenticated connection by cloning and overriding headers
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 4. Attempt to update the rule using unauthenticated connection, expect error
  const unauthUpdateBody = {
    name: RandomGenerator.paragraph({ sentences: 1 }),
  } satisfies IShoppingMallFraudRuleDefinition.IUpdate;

  await TestValidator.error(
    "unauthenticated fraud rule update must fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.fraudRuleDefinitions.update(
        unauthConnection,
        {
          ruleCode: createdRule.ruleCode,
          body: unauthUpdateBody,
        },
      );
    },
  );

  // 5. Positive control: authenticated update should succeed
  const authUpdateBody = {
    description: RandomGenerator.paragraph({ sentences: 3 }),
    isEnabled: false,
  } satisfies IShoppingMallFraudRuleDefinition.IUpdate;

  const updatedRule: IShoppingMallFraudRuleDefinition =
    await api.functional.shoppingMall.platformAdmin.fraudRuleDefinitions.update(
      connection,
      {
        ruleCode: createdRule.ruleCode,
        body: authUpdateBody,
      },
    );
  typia.assert<IShoppingMallFraudRuleDefinition>(updatedRule);

  // Business validation: ruleCode remains unchanged and isEnabled reflects update
  TestValidator.equals(
    "ruleCode must remain stable after authenticated update",
    updatedRule.ruleCode,
    createdRule.ruleCode,
  );

  const expectedIsEnabled: boolean = typia.assert<boolean>(
    authUpdateBody.isEnabled!,
  );
  TestValidator.equals(
    "isEnabled flag must reflect authenticated update payload",
    updatedRule.isEnabled,
    expectedIsEnabled,
  );
}
