import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallFraudRuleDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFraudRuleDefinition";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Ensure that fraud rule definition detail endpoint requires authentication.
 *
 * Business purpose: The platform exposes highly sensitive fraud rule
 * configuration under
 * `/shoppingMall/platformAdmin/fraudRuleDefinitions/{ruleCode}`. These rules
 * drive risk decisions and must only be visible to authenticated platform
 * administrators. This test verifies that an existing rule definition cannot be
 * retrieved without a valid platform admin session.
 *
 * Test steps:
 *
 * 1. Bootstrap a platform admin account using POST /auth/platformAdmin/join.
 *
 *    - Use typia.random<IShoppingMallPlatformAdminJoin.IRequest>() to generate a
 *         realistic join payload.
 *    - Upon success, the SDK automatically injects the admin access token into
 *         `connection.headers.Authorization`.
 * 2. While authenticated, create a fraud rule definition via POST
 *    /shoppingMall/platformAdmin/fraudRuleDefinitions.
 *
 *    - Build a valid IShoppingMallFraudRuleDefinition.ICreate body with explicit,
 *         deterministic values (no random for ruleCode to ensure readability),
 *         for example:
 *
 *         - RuleCode: "TEST_AUTH_RULE"
 *         - Name: RandomGenerator.paragraph(...)
 *         - Description: RandomGenerator.content(...)
 *         - Scope: "order"
 *         - Severity: "high"
 *         - RuleExpression: JSON-ish string or DSL stub
 *         - IsEnabled: true
 *    - Capture the returned rule's `ruleCode` and assert the response shape using
 *         typia.assert.
 * 3. Build an unauthenticated connection instance.
 *
 *    - Clone the incoming `connection` into `unauthenticated` using the spread
 *         operator, but override `headers` with an empty object. Do not touch
 *         `connection.headers` afterwards, and never manipulate
 *         `unauthenticated.headers` beyond this creation.
 * 4. Attempt to GET the fraud rule definition detail with the unauthenticated
 *    connection.
 *
 *    - Call `api.functional.shoppingMall.platformAdmin.fraudRuleDefinitions.at` with
 *         the unauthenticated connection and the captured `ruleCode`.
 *    - Wrap the call with `await TestValidator.error("unauthenticated access to
 *         fraud rule detail must fail", async () => { ... })`.
 *    - Do not inspect HTTP status codes or error payload; only assert that an error
 *         occurs.
 * 5. Positive control (authenticated success path):
 *
 *    - Using the original authenticated `connection`, call the same `at` endpoint
 *         with the same `ruleCode`.
 *    - Assert it succeeds and the result matches `IShoppingMallFraudRuleDefinition`
 *         via typia.assert.
 *    - Optionally, validate that the `ruleCode` in the response equals the
 *         originally created one using `TestValidator.equals`.
 */
export async function test_api_fraud_rule_definition_detail_requires_authentication(
  connection: api.IConnection,
) {
  // 1. Join as platform admin (setup authenticated session)
  const joinRequest = typia.random<IShoppingMallPlatformAdminJoin.IRequest>();
  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinRequest,
    });
  typia.assert(admin);

  // 2. Create a fraud rule definition while authenticated
  const createBody = {
    ruleCode: "TEST_AUTH_RULE_DETAIL_PROTECTION",
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 7,
    }),
    scope: "order",
    severity: "high",
    ruleExpression: RandomGenerator.paragraph({
      sentences: 6,
      wordMin: 4,
      wordMax: 10,
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
  typia.assert(createdRule);

  TestValidator.equals(
    "created fraud rule must have same ruleCode as request",
    createdRule.ruleCode,
    createBody.ruleCode,
  );

  // 3. Build an unauthenticated connection by dropping headers
  const unauthenticated: api.IConnection = { ...connection, headers: {} };

  // 4. Ensure unauthenticated access to detail endpoint fails
  await TestValidator.error(
    "unauthenticated access to fraud rule definition detail must fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.fraudRuleDefinitions.at(
        unauthenticated,
        {
          ruleCode: createdRule.ruleCode,
        },
      );
    },
  );

  // 5. Positive control: authenticated access should succeed
  const fetched: IShoppingMallFraudRuleDefinition =
    await api.functional.shoppingMall.platformAdmin.fraudRuleDefinitions.at(
      connection,
      {
        ruleCode: createdRule.ruleCode,
      },
    );
  typia.assert(fetched);

  TestValidator.equals(
    "authenticated fetch must return same ruleCode",
    fetched.ruleCode,
    createdRule.ruleCode,
  );
}
