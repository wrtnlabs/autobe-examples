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

export async function test_api_administrator_analytics_sale_view_stats_data_integrity(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Validate sale view stats retrieval and authorization enforcement
  // 1. Attempt to retrieve sale view stats without admin authorization (should fail)
  await TestValidator.httpError(
    "unauthorized access without admin token",
    401,
    async () => {
      const anonymousConnection: api.IConnection = { host: connection.host };
      await api.functional.shoppingMall.administrator.analytics.sale_view_stats.getSaleViewStats(
        anonymousConnection,
      );
    },
  );
  // 2. Administrator joins and logs in
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: `admin_${RandomGenerator.alphaNumeric(10)}@test.com`,
      password: "TestAdmin1234",
    },
  });
  typia.assert(adminAuthorized);
  adminConnection.headers = adminConnection.headers ?? {};
  adminConnection.headers.Authorization = `Bearer ${adminAuthorized.token.access}`;
  // 3. Retrieve initial sale view stats
  const initialStat =
    await api.functional.shoppingMall.administrator.analytics.sale_view_stats.getSaleViewStats(
      adminConnection,
    );
  typia.assert(initialStat);
  // NOTE: No API to simulate a sale view event is provided.
  // Thus, cannot simulate increment of stats, only validate the retrieval.
  // 4. Retrieve updated sale view stats again to check consistency
  const updatedStat =
    await api.functional.shoppingMall.administrator.analytics.sale_view_stats.getSaleViewStats(
      adminConnection,
    );
  typia.assert(updatedStat);
  // 5. Validate response fields:
  TestValidator.predicate("viewCount non-negative", updatedStat.viewCount >= 0);
  TestValidator.predicate(
    "uniqueViewCount non-negative",
    updatedStat.uniqueViewCount >= 0,
  );
  TestValidator.predicate(
    "firstViewedAt is valid ISO date",
    !isNaN(Date.parse(updatedStat.firstViewedAt)),
  );
  TestValidator.predicate(
    "lastViewedAt is valid ISO date",
    !isNaN(Date.parse(updatedStat.lastViewedAt)),
  );
  TestValidator.predicate(
    "createdAt is valid ISO date",
    !isNaN(Date.parse(updatedStat.createdAt)),
  );
  TestValidator.predicate(
    "updatedAt is valid ISO date",
    !isNaN(Date.parse(updatedStat.updatedAt)),
  );
  TestValidator.equals("deletedAt is null", updatedStat.deletedAt, null);
}
