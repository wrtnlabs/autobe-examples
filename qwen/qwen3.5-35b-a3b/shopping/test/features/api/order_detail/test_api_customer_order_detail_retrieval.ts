import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_order_detail_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer joins to create account
  const customerJoinConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerJoinConnection, {
    body: {
      email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(typia.random<string & tags.Format<"email">>()),
      password: RandomGenerator.alphaNumeric(12),
      href: "https://example.com/join",
      referrer: "https://example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(customerAuth);
  // 2. Create customer-specific connection with token
  const customerConnection: api.IConnection = { host: connection.host };
  customerConnection.headers = {
    Authorization: customerAuth.token.access,
  };
  // 3. Create a test order using random order ID
  const testOrderId = typia.random<string & tags.Format<"uuid">>();
  // 4. Retrieve order details
  const order = await api.functional.ecommerceMall.customer.orders.at(
    customerConnection,
    {
      orderId: testOrderId,
    },
  );
  typia.assert(order);
  // 5. Validate order header structure
  TestValidator.predicate("order id is valid UUID", order.id === testOrderId);
  TestValidator.predicate(
    "order number is string",
    typeof order.orderNumber === "string",
  );
  TestValidator.predicate(
    "total price is number",
    typeof order.totalPrice === "number",
  );
  TestValidator.predicate(
    "overall status is valid enum",
    [
      "paid",
      "shipped",
      "delivered",
      "cancelled",
      "refunded",
      "partiallyCompleted",
    ].includes(order.overallStatus),
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    typeof order.createdAt === "string" &&
      !Number.isNaN(Date.parse(order.createdAt)),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    typeof order.updatedAt === "string" &&
      !Number.isNaN(Date.parse(order.updatedAt)),
  );
  TestValidator.predicate(
    "deleted_at is either string or null",
    order.deletedAt === null ||
      (typeof order.deletedAt === "string" &&
        !Number.isNaN(Date.parse(order.deletedAt))),
  );
  // 6. Validate customer summary
  TestValidator.equals(
    "customer id matches authenticated user",
    order.customer.id,
    customerAuth.id,
  );
  TestValidator.equals(
    "customer email matches authenticated user",
    order.customer.email,
    customerAuth.email,
  );
  TestValidator.predicate(
    "customer has display name",
    typeof order.customer.display_name === "string",
  );
  TestValidator.predicate(
    "customer ban status is boolean",
    typeof order.customer.is_banned === "boolean",
  );
  TestValidator.predicate(
    "customer created_at is valid date-time",
    !Number.isNaN(Date.parse(order.customer.created_at)),
  );
  // 7. Validate order items
  TestValidator.predicate(
    "order has items array",
    Array.isArray(order.orderItems) && order.orderItems.length > 0,
  );
  for (let i = 0; i < order.orderItems.length; i++) {
    const item = order.orderItems[i];
    const itemTitle = `order item ${i}`;
    // Item basic fields
    TestValidator.predicate(
      `${itemTitle}: has valid UUID id`,
      item.id === item.id,
    );
    TestValidator.predicate(
      `${itemTitle}: item status is string`,
      typeof item.item_status === "string",
    );
    TestValidator.predicate(
      `${itemTitle}: quantity is positive int32`,
      item.quantity > 0,
    );
    TestValidator.predicate(
      `${itemTitle}: unit price is number`,
      typeof item.unit_price === "number",
    );
    // Snapshots (JSON strings preserved at purchase time)
    TestValidator.predicate(
      `${itemTitle}: product_snapshot is JSON string`,
      typeof item.product_snapshot === "string",
    );
    TestValidator.predicate(
      `${itemTitle}: variant_snapshot is JSON string`,
      typeof item.variant_snapshot === "string",
    );
    TestValidator.predicate(
      `${itemTitle}: seller_profile_snapshot is JSON string`,
      typeof item.seller_profile_snapshot === "string",
    );
    // Item timestamps
    TestValidator.predicate(
      `${itemTitle}: created_at is valid date-time`,
      !Number.isNaN(Date.parse(item.created_at)),
    );
    TestValidator.predicate(
      `${itemTitle}: updated_at is valid date-time`,
      !Number.isNaN(Date.parse(item.updated_at)),
    );
    TestValidator.predicate(
      `${itemTitle}: deleted_at is null or date-time`,
      item.deleted_at === null ||
        (typeof item.deleted_at === "string" &&
          !Number.isNaN(Date.parse(item.deleted_at))),
    );
    // Nested references
    TestValidator.equals(
      `${itemTitle}: order reference matches order id`,
      item.order.id,
      order.id,
    );
    TestValidator.equals(
      `${itemTitle}: order reference matches order number`,
      item.order.order_number,
      order.orderNumber,
    );
    // Product summary
    TestValidator.predicate(
      `${itemTitle}: product has valid ID`,
      item.product.id === item.product.id,
    );
    TestValidator.predicate(
      `${itemTitle}: product name is string`,
      typeof item.product.name === "string",
    );
    TestValidator.predicate(
      `${itemTitle}: product basePrice is number`,
      typeof item.product.basePrice === "number",
    );
    TestValidator.predicate(
      `${itemTitle}: product has category`,
      item.product.category !== undefined,
    );
    TestValidator.predicate(
      `${itemTitle}: product has seller`,
      item.product.seller !== undefined,
    );
    TestValidator.predicate(
      `${itemTitle}: product isActive is boolean`,
      typeof item.product.isActive === "boolean",
    );
    // Variant summary
    TestValidator.predicate(
      `${itemTitle}: variant has valid ID`,
      item.variant.id === item.variant.id,
    );
    TestValidator.predicate(
      `${itemTitle}: variant has SKU code`,
      typeof item.variant.skuCode === "string",
    );
    TestValidator.predicate(
      `${itemTitle}: variant has option values`,
      typeof item.variant.optionValues === "string",
    );
    TestValidator.predicate(
      `${itemTitle}: variant priceOverride is number or null`,
      item.variant.priceOverride === null ||
        typeof item.variant.priceOverride === "number",
    );
    TestValidator.predicate(
      `${itemTitle}: variant has stock quantity`,
      item.variant.stockQuantity >= 0,
    );
    TestValidator.predicate(
      `${itemTitle}: variant isActive is boolean`,
      typeof item.variant.isActive === "boolean",
    );
  }
  // 8. Validate shipments
  TestValidator.predicate("shipments is array", Array.isArray(order.shipments));
  for (let i = 0; i < order.shipments.length; i++) {
    const shipment = order.shipments[i];
    const shipmentTitle = `shipment ${i}`;
    TestValidator.predicate(
      `${shipmentTitle}: has valid UUID id`,
      shipment.id === shipment.id,
    );
    TestValidator.equals(
      `${shipmentTitle}: order reference matches order id`,
      shipment.order.id,
      order.id,
    );
    TestValidator.equals(
      `${shipmentTitle}: order reference matches order number`,
      shipment.order.order_number,
      order.orderNumber,
    );
    TestValidator.predicate(
      `${shipmentTitle}: has seller`,
      shipment.seller !== undefined,
    );
    TestValidator.predicate(
      `${shipmentTitle}: carrier name is string`,
      typeof shipment.carrier_name === "string",
    );
    TestValidator.predicate(
      `${shipmentTitle}: tracking number is string`,
      typeof shipment.tracking_number === "string",
    );
    TestValidator.predicate(
      `${shipmentTitle}: created_at is valid date-time`,
      !Number.isNaN(Date.parse(shipment.created_at)),
    );
    TestValidator.predicate(
      `${shipmentTitle}: updated_at is valid date-time`,
      !Number.isNaN(Date.parse(shipment.updated_at)),
    );
    TestValidator.predicate(
      `${shipmentTitle}: deleted_at is null or date-time`,
      shipment.deleted_at === null ||
        (typeof shipment.deleted_at === "string" &&
          !Number.isNaN(Date.parse(shipment.deleted_at))),
    );
  }
  // 9. Validate order ownership (customer can only access own orders)
  TestValidator.equals(
    "order customer id matches authenticated customer",
    order.customer.id,
    customerAuth.id,
  );
}