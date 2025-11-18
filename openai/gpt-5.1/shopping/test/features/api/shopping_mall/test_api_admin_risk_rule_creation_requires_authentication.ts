import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallRiskRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskRule";

export async function test_api_admin_risk_rule_creation_requires_authentication(
  connection: api.IConnection,
) {
  // 1. Build an unauthenticated connection by cloning the base connection
  //    but providing a fresh, empty headers object. DO NOT touch the original
  //    connection.headers in any way.
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 2. Prepare a valid risk rule creation payload using typia.random so that
  //    any failure we see is due to missing authentication, not validation.
  const requestBody = typia.random<IShoppingMallRiskRule.ICreate>();

  // 3. Attempt to create a risk rule with the unauthenticated connection and
  //    expect the call to fail with an authentication/authorization error.
  await TestValidator.error(
    "unauthenticated admin risk rule creation must fail",
    async () => {
      await api.functional.shoppingMall.admin.riskRules.create(
        unauthenticatedConnection,
        { body: requestBody },
      );
    },
  );
}
