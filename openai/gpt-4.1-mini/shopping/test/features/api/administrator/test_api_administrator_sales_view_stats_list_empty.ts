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

/**
 * Test retrieving sales view statistics as an authorized administrator when no sales view statistics records exist in the database.
 * This edge case confirms that the API correctly returns an empty paginated list without errors.
 * Authorization is performed by administrator join prerequisite to ensure the user has access rights.
 * The test validates that the data array is empty, pagination metadata is correctly set to zero records, and no unexpected failures occur.
 * This scenario tests robustness with empty analytical data sets.
 */
export async function test_api_administrator_sales_view_stats_list_empty(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator join for authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized: IShoppingMallAdministrator.IAuthorized =
    await authorize_administrator_join(adminConnection, {
      body: {} satisfies IShoppingMallAdministrator.IJoin,
    });
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = authorized.token.access;
  // 2. Retrieve sales view statistics
  const result: IPageIShoppingMallSaleViewStat.ISummary =
    await api.functional.shoppingMall.administrator.sales.view_stats.index(
      adminConnection,
    );
  // 3. Validate response structure and correctness
  typia.assert(result);
  // 4. Validate empty data array
  TestValidator.equals("data array is empty", result.data.length, 0);
  // 5. Validate pagination metadata reflects zero records
  TestValidator.equals(
    "pagination records count",
    result.pagination.records,
    0,
  );
  TestValidator.equals("pagination pages count", result.pagination.pages, 0);
  TestValidator.equals("pagination current page", result.pagination.current, 1);
  TestValidator.equals("pagination limit", result.pagination.limit, 0);
}
