import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
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
 * Test admin order filtering by status.
 *
 * Validates that an administrator can filter orders by various status values to find orders in specific states. Tests all valid status values (paid, shipped, delivered, cancelled, refunded, partially_completed) ensuring each filter returns only orders matching the specified status.
 *
 * The test creates an admin connection, then tests filtering with each status value and verifies that the returned orders all have the expected status. Also validates pagination metadata reflects accurate filtered counts.
 *
 * 1. Authenticate as administrator using utility function.
 * 2. Test filtering by 'paid' status and verify only paid orders returned.
 * 3. Test filtering by 'shipped' status and verify only shipped orders returned.
 * 4. Test filtering by 'delivered' status and verify only delivered orders returned.
 * 5. Test filtering by 'cancelled' status and verify only cancelled orders returned.
 * 6. Test filtering by 'refunded' status and verify only refunded orders returned.
 * 7. Test filtering by 'partially_completed' status and verify only partially completed orders returned.
 * 8. Verify pagination records count matches returned data length for each filter.
 */
export async function test_api_admin_orders_filtering_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // Define valid status values to test
  const statuses = [
    "paid",
    "shipped",
    "delivered",
    "cancelled",
    "refunded",
    "partially_completed",
  ] as const;
  // 2-7. Test each status filter
  for (const status of statuses) {
    const response =
      await api.functional.ecommerceMall.admin.admin.orders.index(
        adminConnection,
        {
          body: {
            status: status,
            page: 1,
            limit: 100,
          } satisfies IEcommerceMallOrder.IRequest,
        },
      );
    typia.assert(response);
    // Verify pagination records matches data length
    TestValidator.equals(
      `records count matches data length for status '${status}'`,
      response.pagination.records,
      response.data.length,
    );
    // Verify all returned orders have the expected status
    for (const order of response.data) {
      TestValidator.equals(
        `order status matches filter '${status}'`,
        order.status,
        status,
      );
    }
  }
}
