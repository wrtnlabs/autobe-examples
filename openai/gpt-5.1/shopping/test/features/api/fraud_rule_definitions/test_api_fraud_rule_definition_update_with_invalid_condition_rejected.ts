import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallFraudRuleDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFraudRuleDefinition";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate that updating a fraud rule definition with an invalid condition
 * (ruleExpression) is rejected and does not silently succeed.
 *
 * Business context:
 *
 * - Platform admins manage fraud rules via admin APIs.
 * - Each fraud rule is uniquely identified by `ruleCode` and contains scope,
 *   severity, enablement flag, and a serialized condition expression that the
 *   fraud engine evaluates.
 * - When an admin attempts to update a rule’s condition payload with an invalid
 *   expression, the backend must reject the update instead of accepting a
 *   malformed rule that could break or weaken fraud controls.
 *
 * Scenario steps:
 *
 * 1. Register a new platform admin via POST /auth/platformAdmin/join.
 *
 *    - This both creates the admin account and opens an authorized session, wiring
 *         the JWT into the connection automatically.
 * 2. Create a valid fraud rule definition via POST
 *    /shoppingMall/platformAdmin/fraudRuleDefinitions using a well‑formed
 *    `ruleExpression`.
 * 3. Attempt to update the rule via PUT
 *    /shoppingMall/platformAdmin/fraudRuleDefinitions/{ruleCode} with
 *    IShoppingMallFraudRuleDefinition.IUpdate where `ruleExpression` is clearly
 *    invalid for the fraud engine (while still type‑correct as `string`).
 * 4. Assert that the update attempt fails by expecting an error from the SDK call;
 *    if the call succeeds, the test must fail explicitly.
 * 5. Because no GET endpoint for fraudRuleDefinitions is provided in the SDK, we
 *    cannot re‑fetch the rule by ruleCode; instead, we treat any successful
 *    update as a violation of the contract.
 */
export async function test_api_fraud_rule_definition_update_with_invalid_condition_rejected(
  connection: api.IConnection,
) {
  // 1. Register a new platform admin and obtain an authorized session
  const joinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: "127.0.0.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinRequest,
  });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Create a valid baseline fraud rule definition
  const ruleCode = `RULE_${RandomGenerator.alphaNumeric(8)}`;

  const createBody = {
    ruleCode,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    scope: "order",
    severity: "high",
    ruleExpression:
      '{"field":"order.totalAmount","operator":"GREATER_THAN","value":100000}',
    isEnabled: true,
  } satisfies IShoppingMallFraudRuleDefinition.ICreate;

  const createdRule =
    await api.functional.shoppingMall.platformAdmin.fraudRuleDefinitions.create(
      connection,
      { body: createBody },
    );
  typia.assert<IShoppingMallFraudRuleDefinition>(createdRule);

  // Basic sanity checks to ensure the created rule reflects our input
  TestValidator.equals(
    "created ruleCode should match input",
    createdRule.ruleCode,
    createBody.ruleCode,
  );
  TestValidator.equals(
    "created severity should match input",
    createdRule.severity,
    createBody.severity,
  );
  TestValidator.equals(
    "created scope should match input",
    createdRule.scope,
    createBody.scope,
  );
  TestValidator.equals(
    "created isEnabled should match input",
    createdRule.isEnabled,
    createBody.isEnabled,
  );
  TestValidator.equals(
    "created condition should match input ruleExpression",
    createdRule.condition,
    createBody.ruleExpression,
  );

  // 3. Prepare an invalid ruleExpression for update (semantically invalid
  //    for the fraud engine, but still a string type)
  const invalidRuleExpression =
    "INVALID_CONDITION_SYNTAX: field=unknown.attribute, op=NO_SUCH_OPERATOR";

  const updateBody = {
    ruleExpression: invalidRuleExpression,
  } satisfies IShoppingMallFraudRuleDefinition.IUpdate;

  // 4. Attempt the invalid update and assert that it is rejected.
  await TestValidator.error(
    "invalid fraud rule condition update should be rejected",
    async () => {
      const updated =
        await api.functional.shoppingMall.platformAdmin.fraudRuleDefinitions.update(
          connection,
          {
            ruleCode: createdRule.ruleCode,
            body: updateBody,
          },
        );
      // If we reach this point, no error was thrown, which violates the
      // expectation that invalid ruleExpression updates must be rejected.
      typia.assert<IShoppingMallFraudRuleDefinition>(updated);
      throw new Error(
        "Update with invalid fraud rule condition unexpectedly succeeded",
      );
    },
  );
}
