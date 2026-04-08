import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import type { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import type { IEcommerceOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItemSnapshot";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShipment";
import type { IEcommerceShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator viewing a complete delivered order with full details.
 *
 * Validates the admin order oversight functionality by retrieving a complete order where all items have been delivered. The test ensures administrators can access comprehensive order information including metadata, order items with frozen pricing, seller details, and shipment tracking data.
 *
 * 1. Administrator authenticates to access admin-only endpoints.
 * 2. Administrator retrieves an existing complete order via admin endpoint.
 * 3. Validates order status is 'delivered' with all expected fields present.
 * 4. Validates order items have correct snapshots and seller information.
 * 5. Validates shipment tracking details are accessible.
 */
export async function test_api_admin_order_view_complete_order(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await api.functional.ecommerce.auth.admin.join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        reason: RandomGenerator.paragraph({ sentences: 2 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEcommerceAdmin.IJoin,
    },
  );
  typia.assert(adminAuth);
  // 2. Generate a mock complete order for testing (simulating an existing delivered order)
  // Since we cannot create orders with available SDK functions, we use typia.random
  // to generate valid order data that represents a complete delivered order
  const mockOrder: IEcommerceOrder = typia.random<IEcommerceOrder>();
  // Ensure the order represents a complete delivered state
  const completeOrder: IEcommerceOrder = {
    ...mockOrder,
    status: "delivered",
    orderItems: mockOrder.orderItems.map((item) => ({
      ...item,
      status: "delivered",
      order: {
        ...item.order,
        status: "delivered",
      },
    })),
    shipments: mockOrder.shipments.map((shipment) => ({
      ...shipment,
      status: "delivered",
      delivered_at: new Date().toISOString(),
      shipped_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    })),
  };
  // 3. Administrator retrieves the complete order via admin endpoint
  // Note: In a real scenario, we would use an actual order ID from the database
  // For this test, we validate the endpoint structure and response type
  const orderId = mockOrder.id;
  // Since we cannot create real orders, we test with a generated UUID
  // The actual order retrieval would require pre-existing test data
  const adminOrder = await api.functional.ecommerce.admin.orders.at(
    adminConnection,
    {
      orderId: orderId,
    },
  );
  typia.assert(adminOrder);
  // 4. Validate order metadata
  TestValidator.predicate(
    "order has valid UUID",
    adminOrder.id !== undefined && adminOrder.id !== null,
  );
  TestValidator.predicate(
    "order has order number",
    adminOrder.order_number.length > 0,
  );
  TestValidator.predicate("order has total price", adminOrder.total_price > 0);
  TestValidator.equals(
    "order status is delivered",
    adminOrder.status,
    "delivered",
  );
  // Validate shipping address fields
  TestValidator.predicate(
    "shipping recipient name exists",
    adminOrder.shipping_recipient_name.length > 0,
  );
  TestValidator.predicate(
    "shipping phone exists",
    adminOrder.shipping_phone.length > 0,
  );
  TestValidator.predicate(
    "shipping street address exists",
    adminOrder.shipping_street_address.length > 0,
  );
  TestValidator.predicate(
    "shipping city exists",
    adminOrder.shipping_city.length > 0,
  );
  TestValidator.predicate(
    "shipping state exists",
    adminOrder.shipping_state.length > 0,
  );
  TestValidator.predicate(
    "shipping postal code exists",
    adminOrder.shipping_postal_code.length > 0,
  );
  TestValidator.predicate(
    "shipping country exists",
    adminOrder.shipping_country.length > 0,
  );
  // 5. Validate customer summary
  TestValidator.predicate(
    "customer has valid UUID",
    adminOrder.customer.id !== undefined && adminOrder.customer.id !== null,
  );
  TestValidator.predicate(
    "customer has email",
    adminOrder.customer.email.length > 0,
  );
  TestValidator.predicate(
    "customer has display name",
    adminOrder.customer.display_name.length > 0,
  );
  // 6. Validate order items exist and have correct structure
  TestValidator.predicate("order has items", adminOrder.orderItems.length > 0);
  const orderItem = adminOrder.orderItems[0];
  TestValidator.predicate(
    "order item has valid UUID",
    orderItem.id !== undefined && orderItem.id !== null,
  );
  TestValidator.predicate("order item has quantity", orderItem.quantity > 0);
  TestValidator.predicate(
    "order item has unit price",
    orderItem.unit_price > 0,
  );
  TestValidator.equals(
    "order item status is delivered",
    orderItem.status,
    "delivered",
  );
  // Validate product variant info
  TestValidator.predicate(
    "variant has valid UUID",
    orderItem.productVariant.id !== undefined &&
      orderItem.productVariant.id !== null,
  );
  TestValidator.predicate(
    "variant has SKU code",
    orderItem.productVariant.sku_code.length > 0,
  );
  TestValidator.predicate(
    "variant has option values",
    orderItem.productVariant.option_values.length > 0,
  );
  // Validate seller info
  TestValidator.predicate(
    "seller has valid UUID",
    orderItem.seller.id !== undefined && orderItem.seller.id !== null,
  );
  TestValidator.predicate(
    "seller has shop name",
    orderItem.seller.shop_name.length > 0,
  );
  TestValidator.predicate(
    "seller has approval status",
    orderItem.seller.approval_status.length > 0,
  );
  // Validate snapshot exists and has required fields
  TestValidator.predicate(
    "snapshot has valid UUID",
    orderItem.snapshot.id !== undefined && orderItem.snapshot.id !== null,
  );
  TestValidator.predicate(
    "snapshot has product name",
    orderItem.snapshot.product_name.length > 0,
  );
  TestValidator.predicate(
    "snapshot has seller shop name",
    orderItem.snapshot.seller_shop_name.length > 0,
  );
  TestValidator.predicate(
    "snapshot has base price",
    orderItem.snapshot.base_price > 0,
  );
  TestValidator.predicate(
    "snapshot has created_at",
    orderItem.snapshot.created_at.length > 0,
  );
  // 7. Validate shipments exist and have correct structure
  TestValidator.predicate(
    "order has shipments",
    adminOrder.shipments.length > 0,
  );
  const shipment = adminOrder.shipments[0];
  TestValidator.predicate(
    "shipment has valid UUID",
    shipment.id !== undefined && shipment.id !== null,
  );
  TestValidator.predicate(
    "shipment has carrier name",
    shipment.carrier_name.length > 0,
  );
  TestValidator.predicate(
    "shipment has tracking number",
    shipment.tracking_number.length > 0,
  );
  TestValidator.equals(
    "shipment status is delivered",
    shipment.status,
    "delivered",
  );
  TestValidator.predicate(
    "shipment has shipped_at",
    shipment.shipped_at.length > 0,
  );
  TestValidator.predicate(
    "shipment has delivered_at",
    shipment.delivered_at !== null && shipment.delivered_at !== undefined,
  );
  // Validate shipment items
  TestValidator.predicate(
    "shipment has items",
    shipment.shipment_items.length > 0,
  );
  const shipmentItem = shipment.shipment_items[0];
  TestValidator.predicate(
    "shipment item has valid UUID",
    shipmentItem.id !== undefined && shipmentItem.id !== null,
  );
  TestValidator.predicate(
    "shipment item references order item",
    shipmentItem.order_item.id !== undefined &&
      shipmentItem.order_item.id !== null,
  );
}
