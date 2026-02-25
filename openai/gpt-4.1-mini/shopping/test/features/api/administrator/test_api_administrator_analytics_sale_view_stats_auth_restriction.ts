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

/**
 * Test that access to sales view statistics is restricted to authorized administrators only.
 *
 * This test verifies that the endpoint GET /shoppingMall/administrator/analytics/sale-view-stats is not accessible without proper administrator authorization.
 * It attempts calls with no authorization headers and with unauthorized roles, expecting failure.
 * Then it successfully accesses with valid administrator credentials.
 */
export async function test_api_administrator_analytics_sale_view_stats_auth_restriction(
  connection: api.IConnection,
): Promise<void> {
  // 1. Attempt without any authentication
  await TestValidator.httpError(
    "unauthorized because of no auth",
    401,
    async () => {
      const anonymousConnection: api.IConnection = { host: connection.host };
      await api.functional.shoppingMall.administrator.analytics.sale_view_stats.getSaleViewStats(
        anonymousConnection,
      );
    },
  );
  // 2. Join as an administrator and authorize
  const adminConnection: api.IConnection = { host: connection.host };
  const authorizedAdmin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & typia.tags.Format<"email">>(),
      password: "SuperStrongPass1234",
    },
  });
  // Assign token to adminConnection.headers
  adminConnection.headers = {
    Authorization: `Bearer ${authorizedAdmin.token.access}`,
  };
  // 3. Access with valid administrator
  const output =
    await api.functional.shoppingMall.administrator.analytics.sale_view_stats.getSaleViewStats(
      adminConnection,
    );
  typia.assert(output);
  // 4. Attempt with unauthorized role - simulate a customer or seller connection
  {
    const fakeUnauthorizedConnection: api.IConnection = {
      host: connection.host,
    };
    fakeUnauthorizedConnection.headers = {
      Authorization: `Bearer InvalidOrUnauthorizedToken`,
    };
    await TestValidator.httpError(
      "unauthorized because of invalid token",
      401,
      async () => {
        await api.functional.shoppingMall.administrator.analytics.sale_view_stats.getSaleViewStats(
          fakeUnauthorizedConnection,
        );
      },
    );
  }
}
