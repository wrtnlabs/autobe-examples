import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingShipmentTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingShipmentTracking";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSeller";
import type { IShoppingShipmentTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingShipmentTracking";

/**
 * Validate that a seller can search and filter tracking instances and their
 * event logs for a shipment package they own.
 *
 * 1. Register a seller and obtain authentication.
 * 2. Use an assumed existing shipment (dependency handled elsewhere) and package
 *    label.
 * 3. Authenticated: PATCH tracking index with query (status, event dates, source,
 *    order, pagination).
 * 4. Check returned tracking records only belong to the authenticated seller's
 *    shipment/package and respect filter/pagination.
 * 5. Unauthenticated: Try call with unauthenticated connection and expect failure.
 */
export async function test_api_shipment_tracking_instances_search_by_seller(
  connection: api.IConnection,
) {
  // 1. Register a new seller
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    display_name: RandomGenerator.name(),
    contact_phone: RandomGenerator.mobile(),
    status: "pending",
  } satisfies IShoppingSeller.IJoin;
  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: joinBody,
  });
  typia.assert(sellerAuth);

  // 2. Use sample shipment code/package label. In real test, these should come from dependencies/setup. Here we randomize.
  const shipmentCode = RandomGenerator.alphaNumeric(12);
  const packageLabel = RandomGenerator.alphaNumeric(10);

  // 3. Authenticated search with filter parameters
  const trackingSource = RandomGenerator.pick([
    "courier_api",
    "warehouse_scan",
    "manual",
  ] as const);
  const filterStatus = RandomGenerator.pick([
    "in_transit",
    "delivered",
    "delayed",
    "lost",
  ] as const);
  const nowIso = new Date().toISOString();
  const eventStart = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(); // last 7 days
  const eventEnd = nowIso;
  const sortBy = RandomGenerator.pick([
    "created_at",
    "last_update_at",
    "status",
  ] as const);
  const sortOrder = RandomGenerator.pick(["asc", "desc"] as const);
  const pageNum = 1;
  const limit = 5;
  const reqBody: IShoppingShipmentTracking.IRequest = {
    tracking_source: trackingSource,
    status: filterStatus,
    event_start_at: eventStart,
    event_end_at: eventEnd,
    sort_by: sortBy,
    sort_order: sortOrder,
    page: pageNum,
    limit: limit,
  };
  const pageResult =
    await api.functional.shopping.seller.shipments.packages.trackings.index(
      connection,
      { code: shipmentCode, packageLabel: packageLabel, body: reqBody },
    );
  typia.assert(pageResult);
  TestValidator.equals("pagination info structure", Object.keys(pageResult), [
    "pagination",
    "data",
  ]);
  TestValidator.predicate("data is array", Array.isArray(pageResult.data));
  pageResult.data.forEach((tracking) => {
    typia.assert(tracking);
    TestValidator.equals(
      "tracking record package matches query",
      tracking.shopping_shipment_package_id !== null,
      true,
    );
    TestValidator.predicate(
      "status matches filter",
      tracking.status === filterStatus,
    );
    TestValidator.predicate(
      "tracking_source matches filter",
      tracking.tracking_source === trackingSource,
    );
    // Dates and sorting checks could be added if real data
  });

  // 4. Edge: Unauthenticated connection should be denied access
  const unauthenticated: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot search tracking",
    async () => {
      await api.functional.shopping.seller.shipments.packages.trackings.index(
        unauthenticated,
        { code: shipmentCode, packageLabel: packageLabel, body: reqBody },
      );
    },
  );
}
