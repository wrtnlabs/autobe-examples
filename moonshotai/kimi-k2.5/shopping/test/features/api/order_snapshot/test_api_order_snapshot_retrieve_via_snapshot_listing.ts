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

export async function test_api_order_snapshot_retrieve_via_snapshot_listing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Search orders to find one with snapshots
  const orderPage = await api.functional.ecommerceMall.admin.orders.index(
    adminConnection,
    {
      body: {
        status: null,
        customerId: null,
        minTotalPrice: null,
        maxTotalPrice: null,
        createdAfter: null,
        createdBefore: null,
        orderNumber: null,
        page: null,
        limit: null,
      } satisfies IEcommerceMallOrder.IRequest,
    },
  );
  typia.assert(orderPage);
  // Verify orders exist
  TestValidator.predicate(
    "orders exist to test snapshots",
    orderPage.data.length > 0,
  );
  // Select a random order
  const selectedOrder = RandomGenerator.pick(orderPage.data);
  // 3. List snapshots for the selected order
  const snapshotPage =
    await api.functional.ecommerceMall.admin.orders.snapshots.index(
      adminConnection,
      {
        orderId: selectedOrder.id,
        body: {
          createdAtFrom: null,
          createdAtTo: null,
          page: null,
          limit: null,
        } satisfies IEcommerceMallOrderSnapshot.IRequest,
      },
    );
  typia.assert(snapshotPage);
  // Verify snapshots exist
  TestValidator.predicate(
    "snapshots exist for the selected order",
    snapshotPage.data.length > 0,
  );
  // Select a random snapshot from the list
  const selectedSnapshotSummary = RandomGenerator.pick(snapshotPage.data);
  // 4. Retrieve the specific snapshot
  const retrievedSnapshot =
    await api.functional.ecommerceMall.admin.orders.snapshots.at(
      adminConnection,
      {
        orderId: selectedOrder.id,
        snapshotId: selectedSnapshotSummary.id,
      },
    );
  typia.assert(retrievedSnapshot);
  // 5. Validate the retrieved snapshot matches the listing data
  TestValidator.equals(
    "snapshot id matches",
    retrievedSnapshot.id,
    selectedSnapshotSummary.id,
  );
  TestValidator.equals(
    "snapshot orderId matches",
    retrievedSnapshot.orderId,
    selectedSnapshotSummary.order.id,
  );
  TestValidator.equals(
    "snapshot createdAt matches",
    retrievedSnapshot.createdAt,
    selectedSnapshotSummary.createdAt,
  );
}
