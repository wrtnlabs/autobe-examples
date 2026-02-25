import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallSaleViewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleViewStat";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_analytics_sale_view_stats_success(
  connection: api.IConnection,
): Promise<void> {
  // Create an administrator connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123",
    },
  });
  // Fetch aggregated sale view statistics as authorized admin
  const saleViewStats =
    await api.functional.shoppingMall.administrator.analytics.sale_view_stats.getSaleViewStats(
      adminConnection,
    );
  // Confirm the response is an array
  TestValidator.predicate(
    "sale view stats response is array",
    Array.isArray(saleViewStats),
  );
  // Validate the response objects structure
  typia.assertGuardEquals<IShoppingMallSaleViewStat[]>(saleViewStats);
  // Test unauthorized access returns an error
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized access forbidden",
    401,
    async () => {
      await api.functional.shoppingMall.administrator.analytics.sale_view_stats.getSaleViewStats(
        unauthorizedConnection,
      );
    },
  );
}
