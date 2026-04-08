import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipment";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test seller shipment listing multi-seller isolation.
 *
 * Validates that sellers can only view their own shipments and cannot access other sellers' shipment data through the shipment listing endpoint. Ensures proper data isolation at the query level regardless of filter parameters applied.
 *
 * The test creates two seller accounts, authenticates both, and queries shipments from each seller's perspective. It verifies that each seller only receives their own shipment data and that filter operations do not leak data between sellers.
 *
 * 1. Register and authenticate Seller A with unique credentials.
 * 2. Register and authenticate Seller B with different credentials.
 * 3. Query shipments as Seller A without filters and validate response structure.
 * 4. Query shipments as Seller B without filters and validate response structure.
 * 5. Verify each seller's shipments contain only their own seller.id in the seller field.
 * 6. Confirm no data leakage: Seller A's results don't contain Seller B's shipments.
 * 7. Confirm no data leakage: Seller B's results don't contain Seller A's shipments.
 * 8. Apply carrier name filter as Seller A and verify isolation is maintained.
 * 9. Apply date range filter as Seller B and verify isolation is maintained.
 * 10. Test delivery status filter (is_delivered: true/false) for both sellers.
 * 11. Validate pagination metadata is correct for each seller's query.
 */
export async function test_api_seller_shipment_listing_multi_seller_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate Seller A
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerA);
  // 2. Register and authenticate Seller B
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerB);
  // Verify sellers have different IDs
  TestValidator.notEquals("seller IDs differ", sellerA.id, sellerB.id);
  // 3. Query shipments as Seller A (no filters)
  const sellerAShipments =
    await api.functional.shoppingMall.seller.seller.shipments.index(
      sellerAConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IShoppingMallShipment.IRequest,
      },
    );
  typia.assert(sellerAShipments);
  // 4. Query shipments as Seller B (no filters)
  const sellerBShipments =
    await api.functional.shoppingMall.seller.seller.shipments.index(
      sellerBConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IShoppingMallShipment.IRequest,
      },
    );
  typia.assert(sellerBShipments);
  // 5. Verify each seller only sees their own shipments
  for (const shipment of sellerAShipments.data) {
    TestValidator.equals(
      "Seller A shipment belongs to Seller A",
      shipment.seller.id,
      sellerA.id,
    );
  }
  for (const shipment of sellerBShipments.data) {
    TestValidator.equals(
      "Seller B shipment belongs to Seller B",
      shipment.seller.id,
      sellerB.id,
    );
  }
  // 6. Verify no data leakage: Seller A's shipments should not contain Seller B's ID
  const sellerAHasSellerBData = sellerAShipments.data.some(
    (shipment) => shipment.seller.id === sellerB.id,
  );
  TestValidator.predicate(
    "Seller A cannot see Seller B's shipments",
    !sellerAHasSellerBData,
  );
  // 7. Verify no data leakage: Seller B's shipments should not contain Seller A's ID
  const sellerBHasSellerAData = sellerBShipments.data.some(
    (shipment) => shipment.seller.id === sellerA.id,
  );
  TestValidator.predicate(
    "Seller B cannot see Seller A's shipments",
    !sellerBHasSellerAData,
  );
  // 8. Apply carrier name filter as Seller A
  const sellerAFilteredShipments =
    await api.functional.shoppingMall.seller.seller.shipments.index(
      sellerAConnection,
      {
        body: {
          carrier_name: "TestCarrier",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallShipment.IRequest,
      },
    );
  typia.assert(sellerAFilteredShipments);
  // Verify filtered results still only contain Seller A's shipments
  for (const shipment of sellerAFilteredShipments.data) {
    TestValidator.equals(
      "Filtered Seller A shipment belongs to Seller A",
      shipment.seller.id,
      sellerA.id,
    );
  }
  // 9. Apply date range filter as Seller B
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sellerBDateFilteredShipments =
    await api.functional.shoppingMall.seller.seller.shipments.index(
      sellerBConnection,
      {
        body: {
          shipped_from: thirtyDaysAgo.toISOString(),
          shipped_to: now.toISOString(),
          page: 1,
          limit: 20,
        } satisfies IShoppingMallShipment.IRequest,
      },
    );
  typia.assert(sellerBDateFilteredShipments);
  // Verify date-filtered results still only contain Seller B's shipments
  for (const shipment of sellerBDateFilteredShipments.data) {
    TestValidator.equals(
      "Date-filtered Seller B shipment belongs to Seller B",
      shipment.seller.id,
      sellerB.id,
    );
  }
  // 10. Test delivery status filter for both sellers
  const sellerADeliveredShipments =
    await api.functional.shoppingMall.seller.seller.shipments.index(
      sellerAConnection,
      {
        body: {
          is_delivered: true,
          page: 1,
          limit: 20,
        } satisfies IShoppingMallShipment.IRequest,
      },
    );
  typia.assert(sellerADeliveredShipments);
  // Verify delivered filter maintains isolation
  for (const shipment of sellerADeliveredShipments.data) {
    TestValidator.equals(
      "Delivered Seller A shipment belongs to Seller A",
      shipment.seller.id,
      sellerA.id,
    );
    TestValidator.predicate(
      "Shipment is marked as delivered",
      shipment.delivered_at !== null,
    );
  }
  const sellerBInTransitShipments =
    await api.functional.shoppingMall.seller.seller.shipments.index(
      sellerBConnection,
      {
        body: {
          is_delivered: false,
          page: 1,
          limit: 20,
        } satisfies IShoppingMallShipment.IRequest,
      },
    );
  typia.assert(sellerBInTransitShipments);
  // Verify in-transit filter maintains isolation
  for (const shipment of sellerBInTransitShipments.data) {
    TestValidator.equals(
      "In-transit Seller B shipment belongs to Seller B",
      shipment.seller.id,
      sellerB.id,
    );
    TestValidator.predicate(
      "Shipment is marked as in-transit",
      shipment.delivered_at === null,
    );
  }
  // 11. Validate pagination metadata
  TestValidator.predicate(
    "Seller A pagination current page valid",
    sellerAShipments.pagination.current >= 1,
  );
  TestValidator.predicate(
    "Seller A pagination limit valid",
    sellerAShipments.pagination.limit > 0,
  );
  TestValidator.predicate(
    "Seller A pagination records non-negative",
    sellerAShipments.pagination.records >= 0,
  );
  TestValidator.predicate(
    "Seller B pagination current page valid",
    sellerBShipments.pagination.current >= 1,
  );
  TestValidator.predicate(
    "Seller B pagination limit valid",
    sellerBShipments.pagination.limit > 0,
  );
  TestValidator.predicate(
    "Seller B pagination records non-negative",
    sellerBShipments.pagination.records >= 0,
  );
}
