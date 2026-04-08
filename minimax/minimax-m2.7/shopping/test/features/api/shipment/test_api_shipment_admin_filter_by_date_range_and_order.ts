import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_shipment_admin_filter_by_date_range_and_order(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Query shipments without filters (baseline)
  const allShipments =
    await api.functional.ecommerceMall.admin.admin.shipments.index(
      adminConnection,
      {
        body: {} satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(allShipments);
  // 3. Test date range filter
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const dateRangeFilter: IEcommerceMallShipment.IRequest = {
    createdFrom: thirtyDaysAgo.toISOString() as string &
      tags.Format<"date-time">,
    createdTo: tomorrow.toISOString() as string & tags.Format<"date-time">,
  };
  const dateFilteredShipments =
    await api.functional.ecommerceMall.admin.admin.shipments.index(
      adminConnection,
      {
        body: dateRangeFilter satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(dateFilteredShipments);
  // Validate all returned shipments are within date range
  for (const shipment of dateFilteredShipments.data) {
    const createdAt = new Date(shipment.created_at);
    TestValidator.predicate(
      "shipment created_at within range",
      createdAt >= thirtyDaysAgo && createdAt <= tomorrow,
    );
  }
  // 4. Test order ID filter (if we have shipments with order IDs)
  if (allShipments.data.length > 0) {
    const firstShipment = allShipments.data[0];
    const orderIdFilter: IEcommerceMallShipment.IRequest = {
      orderId: firstShipment.order.id,
    };
    const orderFilteredShipments =
      await api.functional.ecommerceMall.admin.admin.shipments.index(
        adminConnection,
        {
          body: orderIdFilter satisfies IEcommerceMallShipment.IRequest,
        },
      );
    typia.assert(orderFilteredShipments);
    // Validate all returned shipments belong to the specified order
    for (const shipment of orderFilteredShipments.data) {
      TestValidator.equals(
        "shipment order_id matches filter",
        shipment.order.id,
        firstShipment.order.id,
      );
    }
    // 5. Test combined filters (date range + order ID)
    const combinedFilter: IEcommerceMallShipment.IRequest = {
      orderId: firstShipment.order.id,
      createdFrom: thirtyDaysAgo.toISOString() as string &
        tags.Format<"date-time">,
      createdTo: tomorrow.toISOString() as string & tags.Format<"date-time">,
    };
    const combinedFilteredShipments =
      await api.functional.ecommerceMall.admin.admin.shipments.index(
        adminConnection,
        {
          body: combinedFilter satisfies IEcommerceMallShipment.IRequest,
        },
      );
    typia.assert(combinedFilteredShipments);
    // Validate combined filters
    for (const shipment of combinedFilteredShipments.data) {
      const createdAt = new Date(shipment.created_at);
      TestValidator.equals(
        "order matches",
        shipment.order.id,
        firstShipment.order.id,
      );
      TestValidator.predicate(
        "created_at within range",
        createdAt >= thirtyDaysAgo && createdAt <= tomorrow,
      );
    }
    // Combined results should be a subset of individual filter results
    TestValidator.predicate(
      "combined filter results <= order filter results",
      combinedFilteredShipments.data.length <=
        orderFilteredShipments.data.length,
    );
  }
  // 6. Validate default sorting (created_at descending)
  if (allShipments.data.length > 1) {
    for (let i = 0; i < allShipments.data.length - 1; i++) {
      const current = new Date(allShipments.data[i].created_at);
      const next = new Date(allShipments.data[i + 1].created_at);
      TestValidator.predicate(
        "results sorted by created_at descending",
        current >= next,
      );
    }
  }
}
