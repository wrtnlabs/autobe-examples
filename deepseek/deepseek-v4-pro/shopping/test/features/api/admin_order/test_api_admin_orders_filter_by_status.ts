import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator order filtering by status.
 *
 * Validates that the administrator order listing endpoint correctly filters
 * orders by the "paid" status. The test authenticates a new administrator,
 * queries orders with a status filter, and confirms that every returned
 * order has a status of exactly "paid".
 *
 * Pagination metadata is also verified to be internally consistent with the
 * returned data, ensuring that the filtered subset is properly reflected in
 * the total record and page counts.
 *
 * 1. Administrator registers via the join endpoint and obtains an auth token.
 * 2. Administrator queries orders with status filter set to "paid".
 * 3. Every order in the response is verified to have status "paid".
 * 4. Pagination metadata is validated for consistency with the data.
 */
export async function test_api_admin_orders_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Query orders filtered by "paid" status
  const result = await api.functional.shoppingMall.admin.orders.index(
    adminConnection,
    {
      body: {
        status: "paid",
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(result);
  // 3. Verify every order has status "paid"
  for (const order of result.data) {
    TestValidator.equals("order status", order.status, "paid");
  }
  // 4. Validate pagination metadata consistency
  TestValidator.predicate(
    "data length does not exceed page limit",
    result.data.length <= result.pagination.limit,
  );
  TestValidator.predicate(
    "total records covers current page data",
    result.pagination.records >= result.data.length,
  );
}
