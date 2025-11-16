import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallFraudRuleDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFraudRuleDefinition";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate that fraud rule creation is rejected without proper platform admin
 * authentication.
 *
 * Business goal: Ensure that the highly sensitive fraud rule configuration
 * surface is not writable by guests or callers lacking a valid platformAdmin
 * auth context. Fraud rules drive risk decisions and must only be managed by
 * privileged operators. This test confirms that the backend enforces that
 * guarantee.
 *
 * High-level flow:
 *
 * 1. Prepare a realistic, valid fraud rule definition payload using
 *    IShoppingMallFraudRuleDefinition.ICreate so that any rejection is purely
 *    auth-related.
 * 2. Derive an unauthenticated connection from the provided test connection by
 *    cloning it but overriding headers with an empty object; this simulates a
 *    caller with no Authorization header at all and respects the SDK’s own
 *    header management semantics.
 * 3. Call api.functional.shoppingMall.platformAdmin.fraudRuleDefinitions.create
 *    with this unauthenticated connection and assert that an error is thrown,
 *    indicating that the endpoint is protected. Do not assert on specific HTTP
 *    status codes.
 * 4. (Optional, not implemented here) As a positive control, you could use
 *    api.functional.auth.platformAdmin.join on the original connection to
 *    establish a platformAdmin session, then call the same create endpoint
 *    again on that now-authenticated connection and assert that a rule is
 *    created successfully.
 */
export async function test_api_fraud_rule_definition_create_requires_authentication(
  connection: api.IConnection,
) {
  // 1. Build a valid fraud rule definition payload so that any failure is auth-related
  const createBody = {
    ruleCode: `TEST_FRAUD_RULE_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 3,
      wordMax: 10,
    }),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 10,
    }),
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
    ruleExpression: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 10,
    }),
    isEnabled: true,
  } satisfies IShoppingMallFraudRuleDefinition.ICreate;

  // 2. Create an unauthenticated connection by cloning the incoming connection
  //    with an empty headers object. Do not touch the original connection.headers.
  const unauthenticated: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 3. Try creating a fraud rule definition without authentication and
  //    assert that an error is thrown (authentication/authorization failure).
  await TestValidator.error(
    "fraud rule definition creation must fail without authentication",
    async () => {
      await api.functional.shoppingMall.platformAdmin.fraudRuleDefinitions.create(
        unauthenticated,
        {
          body: createBody,
        },
      );
    },
  );
}
