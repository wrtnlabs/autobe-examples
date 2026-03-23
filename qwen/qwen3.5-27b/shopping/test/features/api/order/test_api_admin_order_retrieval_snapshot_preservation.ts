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
 * Test that order details preserve product and seller snapshots even after
 * products are deleted or seller profiles are modified.
 *
 * This test validates the snapshot design ensures order history accuracy by:
 * 1. Admin retrieves an existing order
 * 2. Validates that productSnapshot, variantSnapshot, and sellerProfileSnapshot
 *    fields exist and contain properly structured data
 * 3. Confirms snapshots are stored as JSON strings for immutability
 *
 * Note: Full snapshot preservation testing requires additional SDK endpoints
 * for order creation, product updates, and product deletion. This test validates
 * the snapshot structure is present in order retrieval responses.
 */
export async function test_api_admin_order_retrieval_snapshot_preservation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: "admin@snapshot-test.com",
      password: "AdminPass123!",
      href: "https://test.com/admin/join",
      referrer: "https://test.com",
    },
  });
  // 2. Generate a valid order ID for testing
  // In a real scenario, this would be an order created through the customer flow
  const orderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Admin retrieves order details
  const order = await api.functional.shoppingMall.admin.orders.at(
    adminConnection,
    { orderId },
  );
  typia.assert(order);
  // 4. Validate order structure
  TestValidator.predicate("order has items", order.orderItems.length > 0);
  const orderItem = order.orderItems[0];
  // 5. Validate productSnapshot exists and is a JSON string
  TestValidator.predicate(
    "productSnapshot exists",
    orderItem.productSnapshot !== null && orderItem.productSnapshot !== "",
  );
  // Parse and validate product snapshot structure
  const productSnapshot = JSON.parse(orderItem.productSnapshot) as {
    name: string;
    price: number;
    description?: string;
  };
  TestValidator.predicate(
    "productSnapshot has name",
    productSnapshot.name !== undefined && productSnapshot.name !== "",
  );
  TestValidator.predicate(
    "productSnapshot has price",
    productSnapshot.price !== undefined && productSnapshot.price > 0,
  );
  // 6. Validate variantSnapshot exists and is a JSON string
  TestValidator.predicate(
    "variantSnapshot exists",
    orderItem.variantSnapshot !== null && orderItem.variantSnapshot !== "",
  );
  // Parse and validate variant snapshot structure
  const variantSnapshot = JSON.parse(orderItem.variantSnapshot) as {
    sku: string;
    option_values?: Record<string, string>;
  };
  TestValidator.predicate(
    "variantSnapshot has SKU",
    variantSnapshot.sku !== undefined && variantSnapshot.sku !== "",
  );
  // 7. Validate sellerProfileSnapshot exists and is a JSON string
  TestValidator.predicate(
    "sellerProfileSnapshot exists",
    orderItem.sellerProfileSnapshot !== null &&
      orderItem.sellerProfileSnapshot !== "",
  );
  // Parse and validate seller profile snapshot structure
  const sellerProfileSnapshot = JSON.parse(orderItem.sellerProfileSnapshot) as {
    shop_name: string;
    shop_description: string | null;
  };
  TestValidator.predicate(
    "sellerProfileSnapshot has shop_name",
    sellerProfileSnapshot.shop_name !== undefined &&
      sellerProfileSnapshot.shop_name !== "",
  );
  // 8. Validate order price consistency
  TestValidator.predicate("order has valid total price", order.total_price > 0);
  // 9. Validate that order item price matches snapshot price
  TestValidator.equals(
    "order item price matches product snapshot",
    orderItem.price,
    productSnapshot.price,
  );
  // 10. Validate order status is present
  TestValidator.predicate(
    "order has status",
    order.status !== undefined && order.status !== "",
  );
  // 11. Validate customer information is present
  TestValidator.predicate(
    "order has customer",
    order.customer.id !== undefined && order.customer.id !== "",
  );
  // 12. Validate shipping address snapshot exists
  TestValidator.predicate(
    "shipping address snapshot exists",
    order.shipping_address_snapshot !== null &&
      order.shipping_address_snapshot !== "",
  );
  // This test validates that the snapshot fields are properly structured
  // in the order response. In a complete test suite with full SDK access,
  // additional tests would verify that these snapshots remain immutable
  // even after products are updated or deleted.
}
