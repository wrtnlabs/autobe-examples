import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_shipments_view_own(
  connection: api.IConnection,
) {
  // 1. Join seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com",
      referrer: "https://referrer.com",
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(seller);
  const sellerId: string = seller.id;
  // 2. Query all shipments for the seller (may be empty)
  const allShipments =
    await api.functional.ecommerceMall.seller.shipments.index(
      sellerConnection,
      {
        body: {} satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(allShipments);
  // Verify pagination structure
  TestValidator.equals(
    "pagination current page",
    allShipments.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    allShipments.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    allShipments.pagination.pages >= 0,
  );
  // 3. Verify all returned shipments belong to this seller
  for (const shipment of allShipments.data) {
    TestValidator.equals(
      "shipment belongs to seller",
      shipment.seller.id,
      sellerId,
    );
    TestValidator.predicate(
      "shipment has tracking info",
      shipment.tracking_number.length > 0,
    );
    TestValidator.predicate(
      "shipment has carrier name",
      shipment.carrier_name.length > 0,
    );
  }
  // 4. Test filtering by tracking number (partial match)
  const trackingNumberPartial = "TRACK";
  const filteredByTracking =
    await api.functional.ecommerceMall.seller.shipments.index(
      sellerConnection,
      {
        body: {
          trackingNumber: trackingNumberPartial,
        } satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(filteredByTracking);
  // Verify all results contain the tracking number substring (if any results)
  for (const shipment of filteredByTracking.data) {
    TestValidator.predicate(
      "tracking number contains substring",
      shipment.tracking_number.toUpperCase().includes(trackingNumberPartial),
    );
  }
  // 5. Test filtering by status
  const shippedShipments =
    await api.functional.ecommerceMall.seller.shipments.index(
      sellerConnection,
      {
        body: {
          status: "shipped",
        } satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(shippedShipments);
  const deliveredShipments =
    await api.functional.ecommerceMall.seller.shipments.index(
      sellerConnection,
      {
        body: {
          status: "delivered",
        } satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(deliveredShipments);
  // 6. Test pagination with limit
  const paginatedResults =
    await api.functional.ecommerceMall.seller.shipments.index(
      sellerConnection,
      {
        body: {
          limit: 10,
        } satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(paginatedResults);
  TestValidator.predicate(
    "pagination limit respected",
    paginatedResults.data.length <= 10,
  );
  TestValidator.equals(
    "pagination limit",
    paginatedResults.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pagination current page",
    paginatedResults.pagination.current,
    1,
  );
  // 7. Test sorting by different fields
  const sortedByCreatedAt =
    await api.functional.ecommerceMall.seller.shipments.index(
      sellerConnection,
      {
        body: {
          sortBy: "createdAt",
          sortOrder: "desc",
        } satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(sortedByCreatedAt);
  const sortedBySellerId =
    await api.functional.ecommerceMall.seller.shipments.index(
      sellerConnection,
      {
        body: {
          sortBy: "sellerId",
          sortOrder: "asc",
        } satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(sortedBySellerId);
  const sortedByTrackingNumber =
    await api.functional.ecommerceMall.seller.shipments.index(
      sellerConnection,
      {
        body: {
          sortBy: "trackingNumber",
          sortOrder: "desc",
        } satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(sortedByTrackingNumber);
  // 8. Verify seller can only see their own shipments (authorization)
  for (const shipment of paginatedResults.data) {
    TestValidator.equals(
      "shipment belongs to authenticated seller",
      shipment.seller.id,
      sellerId,
    );
  }
  // 9. Test date range filtering
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  const recentShipments =
    await api.functional.ecommerceMall.seller.shipments.index(
      sellerConnection,
      {
        body: {
          createdAfter: threeDaysAgo.toISOString(),
        } satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(recentShipments);
  // 10. Test combined filters (tracking number + status)
  const combinedFilters =
    await api.functional.ecommerceMall.seller.shipments.index(
      sellerConnection,
      {
        body: {
          trackingNumber: "TRACK",
          status: "shipped",
        } satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(combinedFilters);
  // Verify combined filter results
  for (const shipment of combinedFilters.data) {
    TestValidator.predicate(
      "tracking number matches",
      shipment.tracking_number.toUpperCase().includes("TRACK"),
    );
  }
}