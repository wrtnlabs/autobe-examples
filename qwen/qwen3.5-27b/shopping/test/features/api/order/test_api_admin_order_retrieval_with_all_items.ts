import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test that an authenticated administrator can retrieve complete order details including all line items, shipping address snapshot, and order status.
 *
 * This test validates the admin order retrieval endpoint by:
 * 1. Setting up authentication for admin, customer, and seller actors
 * 2. Retrieving an order using the admin endpoint
 * 3. Validating the complete order structure including order items, snapshots, and relationships
 */
export async function test_api_admin_order_retrieval_with_all_items(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      href: "https://test.com/admin",
      referrer: "https://test.com",
      ip: "127.0.0.1",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Customer authentication (for order placement context)
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: "customer@test.com",
      password: "1234",
      display_name: "Test Customer",
      phone_number: "01012345678",
      href: "https://test.com/customer",
      referrer: "https://test.com",
      ip: "127.0.0.1",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // 3. Seller authentication (for product creation context)
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: "seller@test.com",
      password: "1234",
      shop_name: "Test Shop",
      shop_description: "Test shop description",
      href: "https://test.com/seller",
      referrer: "https://test.com",
      ip: "127.0.0.1",
    } satisfies IShoppingMallSeller.IJoin,
  });
  // 4. Since product creation, cart, and order creation APIs are not available,
  // we use a simulated order ID for testing the retrieval endpoint
  const orderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 5. Admin retrieves the order
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.admin.orders.at(adminConnection, {
      orderId,
    });
  typia.assert(order);
  // 6. Validate order structure
  TestValidator.equals("order id matches", order.id, orderId);
  TestValidator.predicate("has customer", order.customer.id !== undefined);
  TestValidator.predicate(
    "has shipping address snapshot",
    order.shipping_address_snapshot.length > 0,
  );
  TestValidator.predicate("has total price", order.total_price >= 0);
  TestValidator.predicate("has status", order.status.length > 0);
  TestValidator.predicate("has created at", order.created_at.length > 0);
  TestValidator.predicate("has updated at", order.updated_at.length > 0);
  // 7. Validate order items structure
  TestValidator.predicate("has order items", order.orderItems.length > 0);
  // Validate each order item
  await ArrayUtil.asyncForEach(order.orderItems, async (item) => {
    typia.assert(item);
    TestValidator.predicate("item has id", item.id.length > 0);
    TestValidator.equals("item order id matches", item.orderId, orderId);
    TestValidator.predicate("item has seller id", item.sellerId.length > 0);
    TestValidator.predicate("item has quantity", item.quantity > 0);
    TestValidator.predicate("item has price", item.price > 0);
    TestValidator.predicate("item has status", item.status.length > 0);
    TestValidator.predicate(
      "item has product snapshot",
      item.productSnapshot.length > 0,
    );
    TestValidator.predicate(
      "item has variant snapshot",
      item.variantSnapshot.length > 0,
    );
    TestValidator.predicate(
      "item has seller profile snapshot",
      item.sellerProfileSnapshot.length > 0,
    );
    // Validate relationships
    typia.assert(item.order);
    TestValidator.equals("item order id matches order", item.order.id, orderId);
    typia.assert(item.seller);
    TestValidator.equals(
      "item seller id matches",
      item.seller.id,
      item.sellerId,
    );
    typia.assert(Array.isArray(item.shipments));
  });
}
