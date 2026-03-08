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

/**
 * Test viewing order containing items from multiple sellers with separate shipments.
 * 1. Create customer account
 * 2. Retrieve multi-seller order
 * 3. Validate order contains multiple shipments (one per seller)
 * 4. Verify shipment-items mapping is correct
 */
export async function test_api_customer_order_multi_seller_view(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account using utility function
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Retrieve multi-seller order
  // Note: The order ID should be from a pre-existing multi-seller order in test database
  // For now, use a generated UUID (actual order must be created separately)
  const orderId = typia.random<string & tags.Format<"uuid">>();
  // Create customer-specific connection for order retrieval
  const orderConnection: api.IConnection = { host: connection.host };
  const order = await api.functional.ecommerceMall.customer.orders.at(
    orderConnection,
    { orderId },
  );
  typia.assert(order);
  // 3. Validate order structure
  // Verify customer owns the order
  TestValidator.equals("customer id matches", order.customer.id, customer.id);
  // Verify order has multiple items
  TestValidator.predicate(
    "order has multiple items",
    order.orderItems.length >= 2,
  );
  // Verify order has multiple shipments (one per seller)
  TestValidator.predicate(
    "order has multiple shipments",
    order.shipments.length >= 2,
  );
  // Verify total price is correct
  const calculatedTotal = order.orderItems.reduce(
    (sum, item) => sum + item.quantity * item.unit_price,
    0,
  );
  TestValidator.equals(
    "total price matches",
    order.total_price,
    calculatedTotal,
  );
  // 4. Verify shipments belong to different sellers
  const sellerIds = new Set(
    order.shipments.map((shipment) => shipment.seller.id),
  );
  TestValidator.equals(
    "shipments have different sellers",
    sellerIds.size,
    order.shipments.length,
  );
  // 5. Verify each item's seller matches a shipment
  for (const item of order.orderItems) {
    const sellerSnapshot = JSON.parse(item.seller_profile_snapshot);
    const matchingShipment = order.shipments.find(
      (shipment) => shipment.seller.id === sellerSnapshot.id,
    );
    TestValidator.predicate(
      "item has matching shipment",
      matchingShipment !== undefined,
    );
  }
}
