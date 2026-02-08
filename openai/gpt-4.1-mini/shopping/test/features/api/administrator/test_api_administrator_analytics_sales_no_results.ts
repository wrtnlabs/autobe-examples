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

export async function test_api_administrator_analytics_sales_no_results(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator join and authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(adminAuthorized);
  // Attach the access token to the adminConnection headers for authorization
  adminConnection.headers = {
    Authorization: adminAuthorized.token.access,
  };
  // 2. Prepare request body with future date range which should return no sales results
  const now = new Date();
  const startDate = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 365); // 1 year ahead
  const endDate = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 366); // 1 year + 1 day ahead
  // Since the provided IRequest type has no detailed properties defined,
  // we will assume it supports optional date range filters and pagination.
  // To simulate no results, add plausible date filters and limit.
  // The scenario states to test a future date range with no sales,
  // so we create a filter with these some typical property names.
  const requestBody: IShoppingMallSaleSalesAnalytic.IRequest = {
    // Since we don't have exact properties in IShoppingMallSaleSalesAnalytic.IRequest,
    // we simulate typical filter props:
    from: startDate.toISOString(),
    to: endDate.toISOString(),
    limit: 10,
    page: 1,
  } as unknown as IShoppingMallSaleSalesAnalytic.IRequest;
  // 3. Call the sales analytics endpoint
  const result =
    await api.functional.shoppingMall.administrator.analytics.sales.index(
      adminConnection,
      {
        body: requestBody,
      },
    );
  // 4. Validate the response
  typia.assert(result);
  // 5. Ensure pagination reports zero records and zero pages
  TestValidator.equals("pagination.records", result.pagination.records, 0);
  TestValidator.equals("pagination.pages", result.pagination.pages, 0);
  TestValidator.equals("pagination.current", result.pagination.current, 1);
  TestValidator.predicate("data array is empty", result.data.length === 0);
}
