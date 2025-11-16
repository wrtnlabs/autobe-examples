import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallFraudRuleDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFraudRuleDefinition";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

export async function test_api_fraud_rule_definition_delete_hard_delete_by_platform_admin(
  connection: api.IConnection,
) {
  // 1. Register a platform administrator so that platformAdmin APIs are authorized
  const adminJoinRequest =
    typia.random<IShoppingMallPlatformAdminJoin.IRequest>();
  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinRequest,
    });
  typia.assert(admin);

  // 2. Create a fraud rule definition with a unique, traceable ruleCode
  const uniqueRuleCode: string = `E2E_RULE_${RandomGenerator.alphaNumeric(12)}`;
  const createBodyBase =
    typia.random<IShoppingMallFraudRuleDefinition.ICreate>();
  const createBody = {
    ...createBodyBase,
    ruleCode: uniqueRuleCode,
  } satisfies IShoppingMallFraudRuleDefinition.ICreate;

  const createdRule: IShoppingMallFraudRuleDefinition =
    await api.functional.shoppingMall.platformAdmin.fraudRuleDefinitions.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(createdRule);

  // Sanity check: created ruleCode must match what we requested
  TestValidator.equals(
    "created fraud rule uses requested ruleCode",
    createdRule.ruleCode,
    uniqueRuleCode,
  );

  // 3. Hard delete the fraud rule definition by ruleCode
  await api.functional.shoppingMall.platformAdmin.fraudRuleDefinitions.erase(
    connection,
    {
      ruleCode: uniqueRuleCode,
    },
  );

  // 4. Validate that deleting again fails, proving the rule no longer exists
  await TestValidator.error(
    "second delete on same ruleCode should fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.fraudRuleDefinitions.erase(
        connection,
        {
          ruleCode: uniqueRuleCode,
        },
      );
    },
  );
}
