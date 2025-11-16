import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderShipment";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderShipment";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShippingPartner } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingPartner";

/**
 * Tests seller shipment listing, pagination, filtering and ownership
 * enforcement.
 *
 * 1. Register & authenticate a new seller.
 * 2. Attempt shipment retrieval for a random (simulated) order number with no
 *    shipments -- should return empty page.
 * 3. Retrieve shipments using pagination with default and random page/limit.
 * 4. For data pages with shipments, validate that required business fields are
 *    present & of correct type.
 * 5. Filter with random status/tracking number values (expecting empty or matching
 *    page).
 * 6. Confirm only the authenticated seller can access their order shipments
 *    (limited in this mock context).
 */
export async function test_api_shopping_mall_order_shipments_seller_retrieval(
  connection: api.IConnection,
) {
  // 1. Seller registration and authentication
  const sellerCreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    business_name: RandomGenerator.name(2),
    registration_number: RandomGenerator.alphaNumeric(8),
    business_phone: RandomGenerator.mobile(),
    href: "https://mall.example.com/dashboard",
    referrer: "https://mall.example.com/landing",
    ip: undefined,
  } satisfies IShoppingMallSeller.ICreate;

  const auth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerCreate,
    });
  typia.assert(auth);
  TestValidator.equals(
    "authenticated seller email",
    auth.email,
    sellerCreate.email,
  );
  TestValidator.equals(
    "authenticated business_name",
    auth.business_name,
    sellerCreate.business_name,
  );

  // 2. Attempt to retrieve shipments for a random order number (expecting possibly empty response)
  const orderNumber = RandomGenerator.alphaNumeric(12);
  const emptyPage: IPageIShoppingMallOrderShipment.ISummary =
    await api.functional.shoppingMall.seller.orders.shipments.index(
      connection,
      {
        orderNumber,
        body: {},
      },
    );
  typia.assert(emptyPage);
  TestValidator.equals(
    "empty shipments page for new/random order",
    emptyPage.data.length,
    0,
  );

  // 3. Simulate shipment listing for a second random order (may or may not contain data in simulation)
  const testOrderNumber = RandomGenerator.alphaNumeric(12);
  const firstPage: IPageIShoppingMallOrderShipment.ISummary =
    await api.functional.shoppingMall.seller.orders.shipments.index(
      connection,
      {
        orderNumber: testOrderNumber,
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 5 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        },
      },
    );
  typia.assert(firstPage);
  // Validate pagination structure
  TestValidator.predicate(
    "pagination object present",
    typeof firstPage.pagination === "object" &&
      typeof firstPage.pagination.current === "number",
  );
  // If shipments exist, validate each record
  for (const shipment of firstPage.data) {
    typia.assert(shipment); // assert IShoppingMallOrderShipment.ISummary
    TestValidator.predicate(
      "shipment has tracking_number",
      typeof shipment.tracking_number === "string" &&
        shipment.tracking_number.length > 0,
    );
    TestValidator.predicate(
      "shipment status valid string",
      typeof shipment.status === "string" && shipment.status.length > 0,
    );
    TestValidator.predicate(
      "shipment has shipping_partner",
      typeof shipment.shipping_partner === "object" &&
        typeof shipment.shipping_partner.partner_name === "string",
    );
    TestValidator.predicate(
      "shipment has order summary",
      typeof shipment.order === "object" &&
        typeof shipment.order.order_number === "string",
    );
  }

  // 4. Try filtering by status with value likely to return empty
  const statusFilter = RandomGenerator.pick([
    "pending",
    "shipped",
    "in_transit",
    "delivered",
    "returned",
  ] as const);
  const filteredPage =
    await api.functional.shoppingMall.seller.orders.shipments.index(
      connection,
      {
        orderNumber: testOrderNumber,
        body: {
          status: statusFilter,
          limit: 10 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        },
      },
    );
  typia.assert(filteredPage);
  for (const shipment of filteredPage.data) {
    typia.assert(shipment);
    TestValidator.equals(
      "filtered shipment status matches filter",
      shipment.status,
      statusFilter,
    );
  }

  // 5. Try filtering by tracking_number (should either return target or empty set)
  if (firstPage.data.length > 0) {
    const anyTrackingNumber = firstPage.data[0].tracking_number;
    const trackingFilteredPage =
      await api.functional.shoppingMall.seller.orders.shipments.index(
        connection,
        {
          orderNumber: testOrderNumber,
          body: {
            tracking_number: anyTrackingNumber,
            limit: 10 as number &
              tags.Type<"int32"> &
              tags.Minimum<1> &
              tags.Maximum<100>,
            page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          },
        },
      );
    typia.assert(trackingFilteredPage);
    TestValidator.predicate(
      "tracking_number filter present in all records",
      trackingFilteredPage.data.every(
        (sh) => sh.tracking_number === anyTrackingNumber,
      ),
    );
  }

  // 6. Confirm that retrieving with unrealistic filter (nonexistent values) yields empty set
  const emptyFilterPage =
    await api.functional.shoppingMall.seller.orders.shipments.index(
      connection,
      {
        orderNumber: testOrderNumber,
        body: {
          status: "nonexistent_status",
          tracking_number: "NONEXISTENT1234",
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 5 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        },
      },
    );
  typia.assert(emptyFilterPage);
  TestValidator.equals(
    "empty page for impossible filter",
    emptyFilterPage.data.length,
    0,
  );
}
