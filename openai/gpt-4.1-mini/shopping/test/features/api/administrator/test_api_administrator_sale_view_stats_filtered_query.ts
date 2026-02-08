import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSaleViewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleViewStat";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSaleViewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleViewStat";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_sale_view_stats_filtered_query(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for administrator
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as administrator with empty body as per IJoin definition
  const authorization = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  // Update headers to include Authorization token
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = `Bearer ${authorization.token.access}`;
  // Since IShoppingMallSaleViewStat.IRequest is an empty type with no properties,
  // we can only send an empty object as the request body
  const requestBody: IShoppingMallSaleViewStat.IRequest = {};
  // Perform the PATCH request to get sale view stats with empty filter
  const response =
    await api.functional.shoppingMall.administrator.sale_view_stats.index(
      adminConnection,
      { body: requestBody },
    );
  // Assert the response to conform to IPageIShoppingMallSaleViewStat.ISummary
  typia.assert(response);
  // Validate pagination information is consistent
  TestValidator.predicate(
    "pagination limit >= 0",
    response.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination current page >= 1",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    response.pagination.records >= 0,
  );
  // Validate each returned record is of the expected sale view stat summary type
  for (const stat of response.data) {
    typia.assert(stat);
  }
}
