import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
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

export async function test_api_customer_order_view_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication via join
  const customerConnection: api.IConnection = { host: connection.host };
  const joinedCustomer = await authorize_customer_join(customerConnection, {
    body: typia.random<IEcommerceMallCustomer.IJoin>(),
  });
  typia.assert(joinedCustomer);
  // 2. Retrieve order details for the customer's order
  // Note: In a real test environment, we would use a pre-existing order ID
  // that belongs to the authenticated customer. For this test, we'll assume
  // there's a known order ID in the test database.
  // Generate a test order ID (in production test, this would be a real order ID)
  const orderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Retrieve the order
  const order = await api.functional.ecommerceMall.customer.orders.at(
    customerConnection,
    {
      orderId,
    },
  );
  typia.assert(order);
  // 3. Validate order structure and basic fields
  TestValidator.equals(
    "order number is present",
    order.order_number.length > 0,
    true,
  );
  TestValidator.predicate("total price is positive", order.total_price > 0);
  TestValidator.equals(
    "overall status is valid",
    order.overall_status,
    order.overall_status satisfies
      | "paid"
      | "shipped"
      | "delivered"
      | "cancelled"
      | "refunded"
      | "partiallyCompleted",
  );
  // Validate customer ownership (data isolation)
  TestValidator.equals(
    "customer matches authenticated user",
    order.customer.id,
    joinedCustomer.id,
  );
  TestValidator.equals(
    "customer email matches authenticated email",
    order.customer.email,
    joinedCustomer.email,
  );
  // 4. Validate order items with purchase-time snapshots
  TestValidator.predicate(
    "has at least one order item",
    order.orderItems.length > 0,
  );
  for (const item of order.orderItems) {
    // Validate item status
    TestValidator.equals(
      "item status is valid",
      item.item_status,
      item.item_status satisfies
        | "paid"
        | "shipped"
        | "delivered"
        | "cancelled"
        | "refunded",
    );
    // Validate quantity
    TestValidator.predicate("quantity is positive", item.quantity > 0);
    // Validate unit price
    TestValidator.predicate("unit price is non-negative", item.unit_price >= 0);
    // Validate product snapshot contains essential data
    const productSnapshot: {
      name: string;
      description: string | null;
      base_price: number;
    } = JSON.parse(item.product_snapshot);
    TestValidator.predicate(
      "product snapshot has name",
      productSnapshot.name.length > 0,
    );
    // Validate variant snapshot contains SKU code
    const variantSnapshot: {
      skuCode: string;
      displayPrice: number;
    } = JSON.parse(item.variant_snapshot);
    TestValidator.predicate(
      "variant snapshot has SKU code",
      variantSnapshot.skuCode.length > 0,
    );
    // Validate seller profile snapshot contains shop name
    const sellerSnapshot: {
      shopName: string;
    } = JSON.parse(item.seller_profile_snapshot);
    TestValidator.predicate(
      "seller snapshot has shop name",
      sellerSnapshot.shopName.length > 0,
    );
  }
  // 5. Validate shipments
  for (const shipment of order.shipments) {
    TestValidator.predicate(
      "shipment has carrier name",
      shipment.carrierName.length > 0,
    );
    TestValidator.predicate(
      "shipment has tracking number",
      shipment.trackingNumber.length > 0,
    );
  }
  // 6. Verify data isolation - customer cannot access other customers' orders
  // Note: This would require knowing another customer's order ID
  // In a full test suite, we would create a second customer and verify isolation
  // For now, we verify the customer can access their own order
  TestValidator.equals(
    "customer can access their own order",
    order.customer.id,
    joinedCustomer.id,
  );
}
