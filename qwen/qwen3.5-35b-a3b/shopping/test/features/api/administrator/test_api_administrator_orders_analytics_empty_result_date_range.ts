import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallOrderAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderAnalytic";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderAnalytic";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_orders_analytics_empty_result_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      display_name: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(admin);
  // 2. Request analytics with past date range (no orders exist)
  const response =
    await api.functional.ecommerceMall.administrator.orders.analytics.index(
      adminConnection,
      {
        body: {
          start_date: "2020-01-01T00:00:00.000Z",
          end_date: "2020-12-31T23:59:59.999Z",
        } satisfies IEcommerceMallOrderAnalytic.IRequest,
      },
    );
  typia.assert(response);
  // 3. Validate response structure
  // 3.1 Verify pagination structure with 0 records
  TestValidator.equals(
    "pagination current page is 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is default",
    response.pagination.limit,
    20,
  );
  TestValidator.equals(
    "pagination records is 0",
    response.pagination.records,
    0,
  );
  TestValidator.equals("pagination pages is 0", response.pagination.pages, 0);
  // 3.2 Verify data array is empty
  TestValidator.equals(
    "data array is empty for 0 records",
    response.data.length,
    0,
  );
  // 4. Verify API handles empty result set gracefully without errors
  TestValidator.predicate(
    "API did not throw error with empty results",
    () => true,
  );
}
