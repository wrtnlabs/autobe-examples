import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallFraudRuleDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFraudRuleDefinition";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Ensure that requesting a non-existent fraud rule definition returns a not
 * found error for platform admins.
 *
 * Business context: Platform administrators manage fraud rules identified by
 * stable business-level rule codes. When an admin requests details for a
 * ruleCode that does not exist in shopping_mall_fraud_rule_definitions, the
 * backend must respond with a 404-style not-found error using the HttpError
 * pathway instead of returning a fake or empty
 * IShoppingMallFraudRuleDefinition. This protects admin tooling from
 * misinterpreting unknown codes as valid rules and aligns with the documented
 * behavior of the at() endpoint.
 *
 * Scenario steps:
 *
 * 1. Join a new platform admin via api.functional.auth.platformAdmin.join with a
 *    random but valid IShoppingMallPlatformAdminJoin.IRequest payload. This
 *    authenticates the connection and sets the Authorization header
 *    automatically.
 * 2. Generate a high-entropy ruleCode string using RandomGenerator.alphaNumeric so
 *    that the probability of it matching any existing fraud rule definition is
 *    negligible. Because this test never creates any fraudRuleDefinition, we
 *    can safely rely on the random value being non-existent.
 * 3. Call api.functional.shoppingMall.platformAdmin.fraudRuleDefinitions.at with
 *    that ruleCode.
 * 4. Use TestValidator.httpError to assert that the call results in an HttpError
 *    with 404 status, indicating proper not-found handling.
 * 5. Do not perform typia.assert on IShoppingMallFraudRuleDefinition in this test,
 *    as the success path must not be taken for a non-existent rule.
 */
export async function test_api_fraud_rule_definition_detail_not_found(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform admin so that we have a valid Authorization context.
  const joinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://admin.shoppingmall.example.com/join",
    referrer: "https://shoppingmall.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinRequest,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Generate a high-entropy, likely-non-existent ruleCode.
  const nonExistentRuleCode: string = `e2e-not-found-${RandomGenerator.alphaNumeric(24)}`;

  // 3 & 4. Attempt to fetch the non-existent fraud rule definition and assert 404 HttpError.
  await TestValidator.httpError(
    "non-existent fraud rule definition should respond with 404",
    404,
    async () => {
      await api.functional.shoppingMall.platformAdmin.fraudRuleDefinitions.at(
        connection,
        {
          ruleCode: nonExistentRuleCode,
        },
      );
    },
  );
}
