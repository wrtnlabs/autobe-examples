import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSaleSalesAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleSalesAnalytic";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSaleSalesAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSalesAnalytic";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_analytics_sales_filtered_query_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication and authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(adminAuth);
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  // 2. Call sales analytics endpoint with empty request body as per available schema
  const response =
    await api.functional.shoppingMall.administrator.analytics.sales.index(
      adminConnection,
      { body: {} },
    );
  typia.assert(response);
  // 3. Validate pagination metadata
  TestValidator.predicate(
    "pagination current is positive",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    response.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    response.pagination.records >= 0,
  );
  // 4. Validate response data array exists and is array
  TestValidator.predicate(
    "response data is array",
    Array.isArray(response.data),
  );
}
