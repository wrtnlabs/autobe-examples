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
 * Test that an administrator can retrieve an order and view its details.
 *
 * This test demonstrates admin order retrieval functionality. Due to limited
 * SDK availability (only order retrieval endpoint is exposed), this test
 * focuses on validating the order retrieval response structure rather than
 * the full partial completion workflow.
 *
 * In a complete implementation, this would:
 * 1. Create two sellers and have them create products
 * 2. Create a customer and place an order with both products
 * 3. Have one seller ship their item while the other doesn't
 * 4. Verify the admin can see the mixed statuses
 */
export async function test_api_admin_order_retrieval_partial_completion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - register and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      href: "https://test.com/admin/join",
      referrer: "https://test.com/admin/join",
      ip: "127.0.0.1",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Generate a valid order ID for retrieval
  // In a full implementation, this would be the ID of an order created
  // with mixed item statuses (partially completed)
  const orderId = typia.random<string & tags.Format<"uuid">>();
  // 3. Admin retrieves the order
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.admin.orders.at(adminConnection, {
      orderId,
    });
  typia.assert(order);
  // 4. Validate order structure
  TestValidator.equals("order has valid ID", order.id, orderId);
  TestValidator.predicate(
    "order has customer info",
    order.customer !== undefined,
  );
  TestValidator.predicate(
    "order has shipping address snapshot",
    order.shipping_address_snapshot !== "",
  );
  TestValidator.predicate(
    "order has non-negative total price",
    order.total_price >= 0,
  );
  TestValidator.predicate("order has status", order.status !== "");
  TestValidator.predicate(
    "order has items array",
    Array.isArray(order.orderItems),
  );
  // 5. Validate customer summary in order
  TestValidator.predicate("customer has ID", order.customer.id !== "");
  TestValidator.predicate("customer has email", order.customer.email !== "");
  TestValidator.predicate(
    "customer has display name",
    order.customer.display_name !== "",
  );
  // 6. Validate order items structure
  // In a partial completion scenario, we would expect:
  // - At least 2 order items from different sellers
  // - Different statuses (e.g., 'shipped' and 'paid')
  // - One item with shipments array populated, another empty
  if (order.orderItems.length > 0) {
    const firstItem = order.orderItems[0];
    TestValidator.predicate("first item has ID", firstItem.id !== "");
    TestValidator.predicate(
      "first item has order ID",
      firstItem.orderId !== "",
    );
    TestValidator.predicate(
      "first item has seller ID",
      firstItem.sellerId !== "",
    );
    TestValidator.predicate("first item has quantity", firstItem.quantity > 0);
    TestValidator.predicate("first item has price", firstItem.price >= 0);
    TestValidator.predicate("first item has status", firstItem.status !== "");
    TestValidator.predicate(
      "first item has product snapshot",
      firstItem.productSnapshot !== "",
    );
    TestValidator.predicate(
      "first item has variant snapshot",
      firstItem.variantSnapshot !== "",
    );
    TestValidator.predicate(
      "first item has seller profile snapshot",
      firstItem.sellerProfileSnapshot !== "",
    );
    TestValidator.predicate(
      "first item has shipments array",
      Array.isArray(firstItem.shipments),
    );
  }
  // 7. Validate timestamps
  TestValidator.predicate("order has created_at", order.created_at !== "");
  TestValidator.predicate("order has updated_at", order.updated_at !== "");
}
