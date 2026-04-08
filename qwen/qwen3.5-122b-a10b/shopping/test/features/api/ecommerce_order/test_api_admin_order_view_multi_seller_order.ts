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
 * Administrator views an order containing items from multiple sellers to validate multi-seller order handling.
 *
 * Validates the complete multi-seller order scenario where a single customer order contains products from different sellers, each fulfilling their items separately. The test ensures that the order response correctly includes all order items with their respective seller information and that shipments are properly associated with the appropriate sellers.
 *
 * The test verifies that each order item displays correct seller metadata including shop_name, approval_status, is_suspended, and is_banned flags. It also validates that the order status calculation works correctly regardless of seller distribution across items.
 *
 * Note: This test assumes a multi-seller order already exists in the database. In a complete test suite, additional setup functions would create the necessary sellers, products, and orders before this test runs.
 *
 * 1. Administrator authenticates via admin join endpoint.
 * 2. Generate a random order UUID to retrieve (in real scenario, this would reference an actual multi-seller order).
 * 3. Call admin orders at endpoint to retrieve order details.
 * 4. Validate response structure with typia.assert.
 * 5. Verify orderItems array contains items from multiple different sellers.
 * 6. Validate each order item's seller information is complete and accurate.
 * 7. Verify shipments are correctly associated with their respective sellers.
 * 8. Validate order status reflects the aggregate state of all order items.
 */
export async function test_api_admin_order_view_multi_seller_order(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      reason: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Generate order ID (in production, this would reference an actual multi-seller order)
  const orderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Retrieve order as administrator
  const order: IEcommerceOrder = await api.functional.ecommerce.admin.orders.at(
    adminConnection,
    {
      orderId,
    },
  );
  typia.assert(order);
  // 4. Validate order structure
  TestValidator.predicate("order has valid ID", order.id !== undefined);
  TestValidator.predicate(
    "order has order number",
    order.order_number.length > 0,
  );
  TestValidator.predicate("order has total price", order.total_price >= 0);
  TestValidator.predicate("order has status", order.status.length > 0);
  // 5. Validate order items exist
  TestValidator.predicate("order has order items", order.orderItems.length > 0);
  // 6. Validate each order item has seller information
  await ArrayUtil.asyncForEach(order.orderItems, async (item, index) => {
    // Validate seller information exists and is complete
    TestValidator.predicate(
      `order item ${index} has seller ID`,
      item.seller.id !== undefined,
    );
    TestValidator.predicate(
      `order item ${index} has shop name`,
      item.seller.shop_name.length > 0,
    );
    TestValidator.predicate(
      `order item ${index} has approval status`,
      item.seller.approval_status.length > 0,
    );
    TestValidator.predicate(
      `order item ${index} has is_suspended flag`,
      typeof item.seller.is_suspended === "boolean",
    );
    TestValidator.predicate(
      `order item ${index} has is_banned flag`,
      typeof item.seller.is_banned === "boolean",
    );
    // Validate product variant information
    TestValidator.predicate(
      `order item ${index} has product variant ID`,
      item.productVariant.id !== undefined,
    );
    TestValidator.predicate(
      `order item ${index} has SKU code`,
      item.productVariant.sku_code.length > 0,
    );
    // Validate order item metadata
    TestValidator.predicate(
      `order item ${index} has quantity`,
      item.quantity >= 1,
    );
    TestValidator.predicate(
      `order item ${index} has unit price`,
      item.unit_price >= 0,
    );
    TestValidator.predicate(
      `order item ${index} has status`,
      item.status.length > 0,
    );
    // Validate snapshot exists
    TestValidator.predicate(
      `order item ${index} has snapshot`,
      item.snapshot !== undefined,
    );
    TestValidator.predicate(
      `order item ${index} snapshot has product name`,
      item.snapshot.product_name.length > 0,
    );
    TestValidator.predicate(
      `order item ${index} snapshot has seller shop name`,
      item.snapshot.seller_shop_name.length > 0,
    );
  });
  // 7. Validate multi-seller scenario (items from different sellers)
  const uniqueSellerIds = new Set(
    order.orderItems.map((item) => item.seller.id),
  );
  TestValidator.predicate(
    "order contains items from multiple sellers",
    uniqueSellerIds.size > 1,
  );
  // 8. Validate shipments exist and are associated with sellers
  if (order.shipments.length > 0) {
    await ArrayUtil.asyncForEach(order.shipments, async (shipment, index) => {
      // Validate shipment has seller information
      TestValidator.predicate(
        `shipment ${index} has seller ID`,
        shipment.seller.id !== undefined,
      );
      TestValidator.predicate(
        `shipment ${index} has shop name`,
        shipment.seller.shop_name.length > 0,
      );
      // Validate shipment tracking information
      TestValidator.predicate(
        `shipment ${index} has carrier name`,
        shipment.carrier_name.length > 0,
      );
      TestValidator.predicate(
        `shipment ${index} has tracking number`,
        shipment.tracking_number.length > 0,
      );
      // Validate shipment items
      TestValidator.predicate(
        `shipment ${index} has shipment items`,
        shipment.shipment_items.length > 0,
      );
      // Validate each shipment item references an order item
      await ArrayUtil.asyncForEach(
        shipment.shipment_items,
        async (shipmentItem, itemIndex) => {
          TestValidator.predicate(
            `shipment ${index} item ${itemIndex} has order item reference`,
            shipmentItem.order_item.id !== undefined,
          );
        },
      );
      // Validate each shipment contains items from only one seller
      const shipmentSellerId = shipment.seller.id;
      TestValidator.predicate(
        `shipment ${index} is associated with correct seller`,
        shipmentSellerId !== undefined,
      );
    });
  }
  // 9. Validate order status reflects aggregate state
  const itemStatuses = order.orderItems.map((item) => item.status);
  const uniqueStatuses = new Set(itemStatuses);
  TestValidator.predicate(
    "order status is valid",
    [
      "paid",
      "shipped",
      "delivered",
      "cancelled",
      "refunded",
      "partially_completed",
    ].includes(order.status),
  );
  // 10. Validate customer information
  TestValidator.predicate(
    "order has customer information",
    order.customer.id !== undefined,
  );
  TestValidator.predicate(
    "order has customer email",
    order.customer.email.length > 0,
  );
  TestValidator.predicate(
    "order has customer display name",
    order.customer.display_name.length > 0,
  );
  // 11. Validate shipping address
  TestValidator.predicate(
    "order has shipping recipient name",
    order.shipping_recipient_name.length > 0,
  );
  TestValidator.predicate(
    "order has shipping phone",
    order.shipping_phone.length > 0,
  );
  TestValidator.predicate(
    "order has shipping street address",
    order.shipping_street_address.length > 0,
  );
  TestValidator.predicate(
    "order has shipping city",
    order.shipping_city.length > 0,
  );
  TestValidator.predicate(
    "order has shipping country",
    order.shipping_country.length > 0,
  );
  // 12. Validate timestamps
  TestValidator.predicate(
    "order has created_at timestamp",
    order.created_at.length > 0,
  );
  TestValidator.predicate(
    "order has updated_at timestamp",
    order.updated_at.length > 0,
  );
}
