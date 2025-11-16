import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallFraudRuleDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFraudRuleDefinition";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

export async function test_api_fraud_rule_definition_delete_requires_platform_admin_auth(
  connection: api.IConnection,
) {
  // 1. Join as platform admin to obtain an authenticated context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Create a fraud rule definition under the authenticated platform admin
  const createBody = {
    ruleCode: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    scope: "order",
    severity: "high",
    ruleExpression: JSON.stringify({
      type: "threshold",
      field: "order.totalAmount",
      operator: ">",
      value: 100000,
    }),
    isEnabled: true,
  } satisfies IShoppingMallFraudRuleDefinition.ICreate;

  const rule: IShoppingMallFraudRuleDefinition =
    await api.functional.shoppingMall.platformAdmin.fraudRuleDefinitions.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert<IShoppingMallFraudRuleDefinition>(rule);

  // 3. Build an unauthenticated connection by dropping headers
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 4. Attempt to erase the fraud rule definition without auth and expect error
  await TestValidator.error("unauthenticated erase must fail", async () => {
    await api.functional.shoppingMall.platformAdmin.fraudRuleDefinitions.erase(
      unauthConnection,
      {
        ruleCode: rule.ruleCode,
      },
    );
  });

  // 5. As the authenticated platform admin, erase should succeed
  await api.functional.shoppingMall.platformAdmin.fraudRuleDefinitions.erase(
    connection,
    {
      ruleCode: rule.ruleCode,
    },
  );
}
