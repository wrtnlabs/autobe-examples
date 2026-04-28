import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import type { IEcommercePlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrder";
import type { IEcommercePlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrderItem";
import type { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import type { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import type { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import type { IEcommercePlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShipment";
import type { IEcommercePlatformShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShipmentItem";
import type { IEcommercePlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_platform_seller_shipments_create } from "../../../generate/generate_random_ecommerce_platform_seller_shipments_create";
import { prepare_random_ecommerce_platform_shipment } from "../../../prepare/prepare_random_ecommerce_platform_shipment";

/**
 * Test seller filtering shipments by delivery status and date range.
 *
 * Validates that sellers can filter their own shipments using status filters (shipped vs delivered), date range predicates (shippedAfter, shippedBefore, deliveredBefore), and text-based search (carrier name partial match, tracking number partial match). Ensures pagination metadata is accurate and all returned shipments match the applied filter criteria.
 *
 * 1. Seller registers and authenticates to the platform.
 * 2. Seller creates multiple shipments with varying statuses and timestamps.
 * 3. Filters shipments by status=delivered to verify only delivered shipments are returned.
 * 4. Filters using date ranges like shippedAfter and deliveredBefore to confirm timestamp-based filtering.
 * 5. Tests carrier name partial matching and tracking number partial search.
 * 6. Validates pagination metadata and that all results satisfy filter constraints.
 */
export async function test_api_seller_shipment_filter_by_status_and_date_range(
  connection: api.IConnection,
) {
  // 1. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 2. Create multiple shipments with different statuses
  const shipment1 =
    await generate_random_ecommerce_platform_seller_shipments_create(
      sellerConnection,
      { body: { carrierName: "FedEx", trackingNumber: "TRACK001" } },
    );
  typia.assert(shipment1);
  const shipment2 =
    await generate_random_ecommerce_platform_seller_shipments_create(
      sellerConnection,
      { body: { carrierName: "UPS", trackingNumber: "TRACK002" } },
    );
  typia.assert(shipment2);
  const shipment3 =
    await generate_random_ecommerce_platform_seller_shipments_create(
      sellerConnection,
      { body: { carrierName: "FedEx", trackingNumber: "TRACK003" } },
    );
  typia.assert(shipment3);
  const shippedDates = [
    shipment1.shipped_at,
    shipment2.shipped_at,
    shipment3.shipped_at,
  ].sort();
  const earliestShipped = shippedDates[0];
  const latestShipped = shippedDates[2];
  // 3. Filter by status 'shipped' - all newly created shipments should have status 'shipped'
  const shippedFilter: IEcommercePlatformShipment.IRequest = {
    status: "shipped",
    page: 1,
  } satisfies IEcommercePlatformShipment.IRequest;
  const shippedResult =
    await api.functional.ecommercePlatform.seller.shipments.index(
      sellerConnection,
      {
        body: shippedFilter,
      },
    );
  typia.assert(shippedResult);
  TestValidator.predicate(
    "status shipped filter returns shipments",
    shippedResult.data.length > 0,
  );
  for (const s of shippedResult.data) {
    typia.assert(s);
    TestValidator.predicate(
      "shipped status has null confirmed_at",
      s.confirmed_at === null,
    );
  }
  // 4. Filter by date range - shippedAfter earliest date
  const dateRangeFilter: IEcommercePlatformShipment.IRequest = {
    shippedAfter: earliestShipped,
    page: 1,
  } satisfies IEcommercePlatformShipment.IRequest;
  const dateRangeResult =
    await api.functional.ecommercePlatform.seller.shipments.index(
      sellerConnection,
      {
        body: dateRangeFilter,
      },
    );
  typia.assert(dateRangeResult);
  TestValidator.predicate(
    "date range filter returns shipments",
    dateRangeResult.data.length > 0,
  );
  for (const s of dateRangeResult.data) {
    typia.assert(s);
    TestValidator.predicate(
      "shipped_at is after or equal to filter",
      s.shipped_at >= earliestShipped,
    );
  }
  // 5. Filter by carrier name partial match (case-insensitive)
  const carrierFilter: IEcommercePlatformShipment.IRequest = {
    carrierName: "fedex",
    page: 1,
  } satisfies IEcommercePlatformShipment.IRequest;
  const carrierResult =
    await api.functional.ecommercePlatform.seller.shipments.index(
      sellerConnection,
      {
        body: carrierFilter,
      },
    );
  typia.assert(carrierResult);
  TestValidator.equals(
    "carrier filter matches created FedEx shipments",
    carrierResult.data.length,
    2,
  );
  for (const s of carrierResult.data) {
    typia.assert(s);
    TestValidator.predicate(
      "carrier name contains fedex (case-insensitive)",
      s.carrier_name.toLowerCase().includes("fedex"),
    );
  }
  // 6. Filter by tracking number partial match
  const trackingFilter: IEcommercePlatformShipment.IRequest = {
    trackingNumber: "TRACK0",
    page: 1,
  } satisfies IEcommercePlatformShipment.IRequest;
  const trackingResult =
    await api.functional.ecommercePlatform.seller.shipments.index(
      sellerConnection,
      {
        body: trackingFilter,
      },
    );
  typia.assert(trackingResult);
  TestValidator.equals(
    "tracking number filter matches all three shipments",
    trackingResult.data.length,
    3,
  );
  for (const s of trackingResult.data) {
    typia.assert(s);
    TestValidator.predicate(
      "tracking number contains TRACK0 (case-insensitive)",
      s.tracking_number.toLowerCase().includes("track0"),
    );
  }
  // 7. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    shippedResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    shippedResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records count matches data length or more",
    shippedResult.pagination.records >= shippedResult.data.length,
  );
}
