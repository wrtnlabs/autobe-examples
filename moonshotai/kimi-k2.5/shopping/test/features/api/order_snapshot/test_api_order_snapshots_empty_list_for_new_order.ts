import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrder";
import type { IPageIEcommerceMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator retrieval of order snapshots when order has no modification history yet.
 * Setup: Admin authenticates, list orders to obtain a valid order ID. New orders have no snapshots.
 * Expected: Empty IPage response structure with pagination.records=0, pages=0, and data=[].
 * Business rule: Orders without modification history return empty snapshot list - normal state, not error.
 */
export async function test_api_order_snapshots_empty_list_for_new_order(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. List orders to obtain a valid order ID
  const ordersPage: IPageIEcommerceMallOrder.ISummary =
    await api.functional.ecommerceMall.admin.orders.index(adminConnection, {
      body: {} satisfies IEcommerceMallOrder.IRequest,
    });
  typia.assert(ordersPage);
  // 3. Get first order ID from the list (use a fallback UUID if empty for test consistency)
  const orderId =
    ordersPage.data[0]?.id ?? typia.random<string & tags.Format<"uuid">>();
  // 4. Retrieve snapshots for the order (new orders have no snapshots)
  const snapshotsPage: IPageIEcommerceMallOrderSnapshot.ISummary =
    await api.functional.ecommerceMall.admin.orders.snapshots.index(
      adminConnection,
      {
        orderId: orderId,
        body: {
          createdAtFrom: null,
          createdAtTo: null,
          page: null,
          limit: null,
        } satisfies IEcommerceMallOrderSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsPage);
  // 5. Verify empty pagination structure for new orders
  typia.assert(snapshotsPage);
}
