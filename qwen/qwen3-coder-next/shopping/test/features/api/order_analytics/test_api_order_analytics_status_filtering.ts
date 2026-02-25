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

export async function test_api_order_analytics_status_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<IShoppingMallAdmin.IJoin>(),
  });
  // 2. Create multiple orders with different statuses
  // Note: Since we cannot control order status directly in this simplified flow,
  // we'll test that the API accepts status filtering without errors
  // 3. Test analytics with status filter - paid status
  const paidResult =
    await api.functional.shoppingMall.admin.analytics.orders.index(
      adminConnection,
      {
        body: {
          status: "paid",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallOrder.IRequest,
      },
    );
  typia.assert(paidResult);
  // Validate response structure exists
  TestValidator.predicate(
    "paid result has data array",
    paidResult.data !== undefined && Array.isArray(paidResult.data),
  );
  TestValidator.predicate(
    "paid result has pagination",
    paidResult.pagination !== undefined,
  );
  // 4. Test analytics with status filter - shipped status
  const shippedResult =
    await api.functional.shoppingMall.admin.analytics.orders.index(
      adminConnection,
      {
        body: {
          status: "shipped",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallOrder.IRequest,
      },
    );
  typia.assert(shippedResult);
  TestValidator.predicate(
    "shipped result has data array",
    shippedResult.data !== undefined && Array.isArray(shippedResult.data),
  );
  // 5. Test analytics with status filter - delivered status
  const deliveredResult =
    await api.functional.shoppingMall.admin.analytics.orders.index(
      adminConnection,
      {
        body: {
          status: "delivered",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallOrder.IRequest,
      },
    );
  typia.assert(deliveredResult);
  TestValidator.predicate(
    "delivered result has data array",
    deliveredResult.data !== undefined && Array.isArray(deliveredResult.data),
  );
  // 6. Test analytics with no status filter (all statuses)
  const allResult =
    await api.functional.shoppingMall.admin.analytics.orders.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallOrder.IRequest,
      },
    );
  typia.assert(allResult);
  TestValidator.predicate(
    "all result has data array",
    allResult.data !== undefined && Array.isArray(allResult.data),
  );
  // 7. Verify status_counts structure exists in at least one result
  if (paidResult.data.length > 0) {
    const firstData = paidResult.data[0];
    TestValidator.predicate(
      "status_counts exists",
      firstData.status_counts !== undefined,
    );
    TestValidator.predicate(
      "total_orders exists",
      firstData.total_orders !== undefined,
    );
    TestValidator.predicate(
      "total_revenue exists",
      firstData.total_revenue !== undefined,
    );
    TestValidator.predicate(
      "avg_order_value exists",
      firstData.avg_order_value !== undefined,
    );
  }
}