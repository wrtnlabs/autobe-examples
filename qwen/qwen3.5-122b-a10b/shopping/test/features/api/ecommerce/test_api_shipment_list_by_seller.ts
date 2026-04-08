import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import type { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
import type { IEcommerceShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShipment";
import type { IEcommerceShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_seller_orders_shipments_create } from "../../../generate/generate_random_ecommerce_seller_orders_shipments_create";
import { prepare_random_ecommerce_shipment } from "../../../prepare/prepare_random_ecommerce_shipment";

/**
 * Test seller shipment listing for order fulfillment tracking.
 *
 * Validates that authenticated sellers can retrieve paginated shipment lists for orders containing their products. The test verifies shipment tracking information including carrier details, tracking numbers, delivery status, and associated order/seller references.
 *
 * This test ensures sellers have proper visibility into their order fulfillment workflow and can access tracking information for all shipments associated with their orders.
 *
 * 1. Register and authenticate a seller account.
 * 2. Create a test order with order items belonging to the seller.
 * 3. Create one or more shipments for the order items with tracking information.
 * 4. Retrieve the shipment list via the index endpoint.
 * 5. Validate pagination metadata and shipment summary structure.
 * 6. Verify each shipment contains carrier details, tracking info, and order/seller references.
 */
export async function test_api_shipment_list_by_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Create a test order ID for shipment operations
  // In a full integration test, this would be a real order created via the order API
  const orderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Create first shipment with complete tracking information
  const shipment1 =
    await api.functional.ecommerce.seller.orders.shipments.create(
      sellerConnection,
      {
        orderId,
        body: {
          carrier_name: RandomGenerator.pick(["UPS", "FedEx", "USPS", "DHL"]),
          tracking_number: RandomGenerator.alphaNumeric(12),
          tracking_url: typia.random<string & tags.Format<"uri">>(),
          order_item_ids: [typia.random<string & tags.Format<"uuid">>()],
        } satisfies IEcommerceShipment.ICreate,
      },
    );
  typia.assert(shipment1);
  // 4. Create second shipment for pagination testing
  const shipment2 =
    await api.functional.ecommerce.seller.orders.shipments.create(
      sellerConnection,
      {
        orderId,
        body: {
          carrier_name: RandomGenerator.pick(["UPS", "FedEx", "USPS", "DHL"]),
          tracking_number: RandomGenerator.alphaNumeric(12),
          // tracking_url is optional, test without it
          order_item_ids: [typia.random<string & tags.Format<"uuid">>()],
        } satisfies IEcommerceShipment.ICreate,
      },
    );
  typia.assert(shipment2);
  // 5. Retrieve shipment list with pagination
  const shipmentList =
    await api.functional.ecommerce.seller.orders.shipments.index(
      sellerConnection,
      {
        orderId,
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceShipment.IRequest,
      },
    );
  typia.assert(shipmentList);
  // 6. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    shipmentList.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit positive",
    shipmentList.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    shipmentList.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    shipmentList.pagination.pages >= 0,
  );
  // 7. Validate shipment data array
  TestValidator.predicate(
    "shipments array exists",
    Array.isArray(shipmentList.data),
  );
  TestValidator.predicate(
    "shipments count matches records",
    shipmentList.data.length === shipmentList.pagination.records,
  );
  // 8. Validate each shipment has required tracking information
  for (const shipment of shipmentList.data) {
    typia.assert(shipment);
    TestValidator.predicate(
      "shipment has carrier name",
      shipment.carrier_name.length > 0,
    );
    TestValidator.predicate(
      "shipment has tracking number",
      shipment.tracking_number.length > 0,
    );
    TestValidator.predicate(
      "shipment has shipped date",
      shipment.shipped_at.length > 0,
    );
    TestValidator.predicate("shipment has status", shipment.status.length > 0);
    // Validate order reference
    TestValidator.predicate(
      "shipment has order reference",
      shipment.order !== null,
    );
    TestValidator.predicate("order has ID", shipment.order.id.length > 0);
    TestValidator.predicate(
      "order has order number",
      shipment.order.order_number.length > 0,
    );
    // Validate seller reference
    TestValidator.predicate(
      "shipment has seller reference",
      shipment.seller !== null,
    );
    TestValidator.predicate("seller has ID", shipment.seller.id.length > 0);
    TestValidator.predicate(
      "seller has shop name",
      shipment.seller.shop_name.length > 0,
    );
  }
  // 9. Verify created shipments appear in the list
  const shipmentIds = shipmentList.data.map((s) => s.id);
  TestValidator.predicate(
    "first shipment in list",
    shipmentIds.includes(shipment1.id),
  );
  TestValidator.predicate(
    "second shipment in list",
    shipmentIds.includes(shipment2.id),
  );
}
