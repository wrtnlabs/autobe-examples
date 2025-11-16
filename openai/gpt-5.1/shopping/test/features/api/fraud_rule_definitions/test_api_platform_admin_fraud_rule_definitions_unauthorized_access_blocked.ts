import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallFraudRuleDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallFraudRuleDefinition";
import type { IShoppingMallFraudRuleDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFraudRuleDefinition";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Verify that the fraud rule definition search endpoint is restricted to
 * platform admins and that unauthenticated callers are blocked.
 *
 * Business intent:
 *
 * - Ensure PATCH /shoppingMall/platformAdmin/fraudRuleDefinitions works when
 *   called by an authenticated platform admin and returns a valid paginated
 *   result.
 * - Ensure the same endpoint fails when called without any Authorization header,
 *   preventing unauthenticated enumeration of internal fraud rule definitions.
 *
 * Steps:
 *
 * 1. Join as a platform admin via POST /auth/platformAdmin/join.
 * 2. As that admin, create at least one fraud rule definition via POST
 *    /shoppingMall/platformAdmin/fraudRuleDefinitions.
 * 3. As the authenticated admin, search fraud rule definitions with PATCH
 *    /shoppingMall/platformAdmin/fraudRuleDefinitions and verify a successful,
 *    type-correct paginated response that includes rules matching the created
 *    ruleCode prefix.
 * 4. Create a new unauthenticated connection object (no Authorization header).
 * 5. Using the unauthenticated connection, call the same search endpoint and
 *    assert that it fails with an error, indicating that unauthorized access is
 *    blocked.
 */
export async function test_api_platform_admin_fraud_rule_definitions_unauthorized_access_blocked(
  connection: api.IConnection,
) {
  // 1. Join as a platform admin
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: "Passw0rd!123",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create at least one fraud rule definition as the authenticated admin
  const ruleCodePrefix = "TEST_RULE_";
  const ruleCode = `${ruleCodePrefix}${RandomGenerator.alphaNumeric(8)}`;

  const createBody = {
    ruleCode,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    scope: "order",
    severity: "high",
    ruleExpression: '{ "type": "threshold", "value": 1000 }',
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
    "created rule code must match input",
    createdRule.ruleCode,
    ruleCode,
  );

  // 3. Authenticated search should succeed and return valid pagination
  const searchBody = {
    rule_code_prefix: ruleCodePrefix,
    page: 1,
    limit: 10,
  } satisfies IShoppingMallFraudRuleDefinition.IRequest;

  const searchResult: IPageIShoppingMallFraudRuleDefinition.ISummary =
    await api.functional.shoppingMall.platformAdmin.fraudRuleDefinitions.index(
      connection,
      {
        body: searchBody,
      },
    );
  typia.assert(searchResult);

  TestValidator.predicate(
    "authenticated search should return at least one fraud rule",
    searchResult.data.length >= 1,
  );

  // Ensure all returned rules respect the prefix filter when rule_code_prefix is used
  for (const summary of searchResult.data) {
    TestValidator.predicate(
      "summary.rule_code should start with the configured prefix",
      summary.rule_code.startsWith(ruleCodePrefix),
    );
  }

  // 4. Create a new unauthenticated connection (no Authorization header)
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 5. Unauthenticated search must fail with an error
  await TestValidator.error(
    "unauthenticated caller must not be able to search fraud rule definitions",
    async () => {
      await api.functional.shoppingMall.platformAdmin.fraudRuleDefinitions.index(
        unauthConnection,
        {
          body: searchBody,
        },
      );
    },
  );
}
