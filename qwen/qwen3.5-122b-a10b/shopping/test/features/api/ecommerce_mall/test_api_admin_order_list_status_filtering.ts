import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrder";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator order list status filtering functionality.
 *
 * 1. Authenticate as administrator
 * 2. Filter orders by different status values (paid, shipped, delivered, cancelled, refunded, partiallyCompleted)
 * 3. Validate that filtered results only contain orders with matching status
 * 4. Verify pagination metadata is correct for filtered results
 */
export async function test_api_admin_order_list_status_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: typia.random<IEcommerceMallAdmin.IJoin>(),
  });
  typia.assert(adminAuth);
  // 2. Test filtering by different status values
  const statuses: Array<
    | "paid"
    | "shipped"
    | "delivered"
    | "cancelled"
    | "refunded"
    | "partiallyCompleted"
  > = [
    "paid",
    "shipped",
    "delivered",
    "cancelled",
    "refunded",
    "partiallyCompleted",
  ];
  await ArrayUtil.asyncForEach(statuses, async (status) => {
    const filteredOrders =
      await api.functional.ecommerceMall.admin.customers.orders.index(
        adminConnection,
        {
          body: {
            status: status,
            page: 0,
            limit: 20,
          } satisfies IEcommerceMallOrder.IRequest,
        },
      );
    typia.assert(filteredOrders);
    // 3. Validate all returned orders match the filtered status
    TestValidator.predicate(
      `all orders should have status "${status}"`,
      filteredOrders.data.every((order) => order.status === status),
    );
    // 4. Verify pagination metadata
    TestValidator.predicate(
      "pagination records should match data length",
      filteredOrders.pagination.records >= filteredOrders.data.length,
    );
    TestValidator.predicate(
      "pagination current page should be valid",
      filteredOrders.pagination.current >= 0,
    );
    TestValidator.predicate(
      "pagination limit should be valid",
      filteredOrders.pagination.limit >= 0,
    );
  });
}
