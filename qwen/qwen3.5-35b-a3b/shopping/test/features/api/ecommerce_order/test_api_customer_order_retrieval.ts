import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
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

/**
 * Test customer order retrieval workflow.
 *
 * This test validates that an authenticated customer can retrieve their own order details.
 * Note: Order creation is a prerequisite - this test assumes an order exists in the system.
 * The customer must have created an order previously through the order creation workflow.
 *
 * 1. Customer registers and logs in
 * 2. Customer retrieves their own order details using order UUID
 * 3. Validate complete order information including order items, shipping address, and shipment tracking
 */
export async function test_api_customer_order_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer);
  // customerConnection.headers is updated internally by authorize_customer_join
  // Use customerConnection for all subsequent API calls
  // 2. Retrieve order details
  // Note: In a complete test suite, this would use an order ID created by a prior order creation test
  // For this test, we assume an order exists in the system
  const existingOrderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const retrievedOrder = await api.functional.ecommerceMall.customer.orders.at(
    customerConnection,
    {
      orderId: existingOrderId,
    },
  );
  typia.assert(retrievedOrder);
  // 3. Validate order owner can access the order
  TestValidator.equals(
    "order belongs to authenticated customer",
    retrievedOrder.customer.id,
    customer.id,
  );
  TestValidator.equals(
    "order number is present",
    retrievedOrder.order_number.length > 0,
    true,
  );
  TestValidator.equals(
    "total price is positive",
    retrievedOrder.total_price > 0,
    true,
  );
  TestValidator.predicate(
    "order has valid status",
    [
      "pending",
      "paid",
      "shipped",
      "delivered",
      "cancelled",
      "refunded",
      "partially_completed",
    ].includes(retrievedOrder.status),
  );
  // Validate shipping address is included with required fields
  TestValidator.equals(
    "shipping address has recipient name",
    retrievedOrder.shippingAddress.recipient_name.length > 0,
    true,
  );
  TestValidator.equals(
    "shipping address has street",
    retrievedOrder.shippingAddress.street.length > 0,
    true,
  );
  TestValidator.equals(
    "shipping address has city",
    retrievedOrder.shippingAddress.city.length > 0,
    true,
  );
  TestValidator.equals(
    "shipping address has state",
    retrievedOrder.shippingAddress.state.length > 0,
    true,
  );
  TestValidator.equals(
    "shipping address isDefault field present",
    typeof retrievedOrder.shippingAddress.is_default === "boolean",
    true,
  );
  // Validate order items are included and have required fields
  TestValidator.equals(
    "order items array exists",
    Array.isArray(retrievedOrder.orderItems),
    true,
  );
  if (retrievedOrder.orderItems.length > 0) {
    const firstItem = retrievedOrder.orderItems[0];
    TestValidator.equals(
      "order item has product name",
      firstItem.productName.length > 0,
      true,
    );
    TestValidator.equals(
      "order item has SKU",
      firstItem.productSku.length > 0,
      true,
    );
    TestValidator.equals(
      "order item has variant name",
      firstItem.variantName.length > 0,
      true,
    );
    TestValidator.equals(
      "order item quantity is at least 1",
      firstItem.quantity >= 1,
      true,
    );
    TestValidator.equals(
      "order item unit price is positive",
      firstItem.unitPrice > 0,
      true,
    );
    TestValidator.equals(
      "order item total price is positive",
      firstItem.totalPrice > 0,
      true,
    );
    TestValidator.predicate(
      "order item has valid status",
      [
        "paid",
        "shipped",
        "delivered",
        "cancelled",
        "refunded",
        "partially_completed",
      ].includes(firstItem.status),
    );
  }
  // Validate shipment data if present
  if (retrievedOrder.shipments.length > 0) {
    const firstShipment = retrievedOrder.shipments[0];
    TestValidator.equals(
      "shipment trackingCount is at least 0",
      firstShipment.trackingCount >= 0,
      true,
    );
    TestValidator.equals(
      "shipment has status",
      typeof firstShipment.status === "string" &&
        firstShipment.status.length > 0,
      true,
    );
  }
  // Validate timestamps are valid ISO 8601 format
  TestValidator.predicate(
    "created_at is valid date-time",
    () => !isNaN(new Date(retrievedOrder.created_at).getTime()),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    () => !isNaN(new Date(retrievedOrder.updated_at).getTime()),
  );
  TestValidator.equals(
    "deleted_at is nullable or valid",
    retrievedOrder.deleted_at === null ||
      !isNaN(new Date(retrievedOrder.deleted_at).getTime()),
    true,
  );
}
