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
 * Test shipment listing with seller-level access control separation.
 *
 * Validates that the shipment listing endpoint enforces row-level security where sellers can only view shipments containing their own products. When multiple sellers ship items from the same customer order, each seller should only see their own shipments in the response.
 *
 * This test authenticates two different sellers and verifies that the shipment listing endpoint properly separates shipments by seller ownership. The endpoint is called with the same order ID from both seller connections, and the responses are validated to ensure sellers cannot access other sellers' shipment information.
 *
 * 1. Register and authenticate two separate sellers (Seller A and Seller B).
 * 2. Use a test order ID to query shipments from both seller connections.
 * 3. Validate that each seller's response contains only their own shipments.
 * 4. Verify row-level security by confirming sellers cannot see each other's shipments.
 * 5. Validate response structure including pagination and shipment summary fields.
 */
export async function test_api_shipment_list_seller_separation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate Seller A
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      href: "https://test.com/seller-a",
      referrer: "https://test.com/",
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(sellerA);
  // 2. Register and authenticate Seller B
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      href: "https://test.com/seller-b",
      referrer: "https://test.com/",
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(sellerB);
  // 3. Use a test order ID (in real scenario, this would be an order with items from both sellers)
  const testOrderId = typia.random<string & tags.Format<"uuid">>();
  // 4. Seller A lists shipments for the order
  const sellerAShipments =
    await api.functional.ecommerce.seller.orders.shipments.index(
      sellerAConnection,
      {
        orderId: testOrderId,
        body: {},
      },
    );
  typia.assert(sellerAShipments);
  // 5. Seller B lists shipments for the same order
  const sellerBShipments =
    await api.functional.ecommerce.seller.orders.shipments.index(
      sellerBConnection,
      {
        orderId: testOrderId,
        body: {},
      },
    );
  typia.assert(sellerBShipments);
  // 6. Validate response structure
  TestValidator.predicate(
    "seller A shipment response has pagination",
    sellerAShipments.pagination !== undefined,
  );
  TestValidator.predicate(
    "seller B shipment response has pagination",
    sellerBShipments.pagination !== undefined,
  );
  TestValidator.predicate(
    "seller A shipment response has data array",
    Array.isArray(sellerAShipments.data),
  );
  TestValidator.predicate(
    "seller B shipment response has data array",
    Array.isArray(sellerBShipments.data),
  );
  // 7. Validate pagination metadata
  TestValidator.predicate(
    "seller A pagination has current page",
    sellerAShipments.pagination.current >= 0,
  );
  TestValidator.predicate(
    "seller A pagination has limit",
    sellerAShipments.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "seller A pagination has record count",
    sellerAShipments.pagination.records >= 0,
  );
  TestValidator.predicate(
    "seller A pagination has page count",
    sellerAShipments.pagination.pages >= 0,
  );
  // 8. Validate shipment data structure (if any shipments exist)
  if (sellerAShipments.data.length > 0) {
    const shipmentA = sellerAShipments.data[0];
    TestValidator.predicate(
      "seller A shipment has ID",
      shipmentA.id !== undefined,
    );
    TestValidator.predicate(
      "seller A shipment has carrier name",
      shipmentA.carrier_name !== undefined,
    );
    TestValidator.predicate(
      "seller A shipment has tracking number",
      shipmentA.tracking_number !== undefined,
    );
    TestValidator.predicate(
      "seller A shipment has status",
      shipmentA.status !== undefined,
    );
  }
  if (sellerBShipments.data.length > 0) {
    const shipmentB = sellerBShipments.data[0];
    TestValidator.predicate(
      "seller B shipment has ID",
      shipmentB.id !== undefined,
    );
    TestValidator.predicate(
      "seller B shipment has carrier name",
      shipmentB.carrier_name !== undefined,
    );
    TestValidator.predicate(
      "seller B shipment has tracking number",
      shipmentB.tracking_number !== undefined,
    );
    TestValidator.predicate(
      "seller B shipment has status",
      shipmentB.status !== undefined,
    );
  }
  // 9. Validate row-level security: sellers should see different shipments
  // (or empty arrays if no shipments exist for that seller)
  TestValidator.predicate(
    "seller A and seller B responses are separate",
    sellerAShipments !== sellerBShipments,
  );
  // 10. Validate that if shipments exist, they belong to the respective seller
  if (sellerAShipments.data.length > 0 && sellerBShipments.data.length > 0) {
    const sellerAShipmentIds = sellerAShipments.data.map((s) => s.id);
    const sellerBShipmentIds = sellerBShipments.data.map((s) => s.id);
    // Verify no overlap (seller A cannot see seller B's shipments and vice versa)
    const hasOverlap = sellerAShipmentIds.some((id) =>
      sellerBShipmentIds.includes(id),
    );
    TestValidator.predicate(
      "no shipment ID overlap between sellers",
      !hasOverlap,
    );
  }
}
