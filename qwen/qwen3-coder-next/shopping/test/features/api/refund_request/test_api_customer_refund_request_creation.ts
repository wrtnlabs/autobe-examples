import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItemStatusLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItemStatusLog";
import type { IShoppingMallAdminSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSessions";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemStatusLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemStatusLog";
import type { IShoppingMallOrderProductSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderProductSnapshots";
import type { IShoppingMallOrderRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderRefundRequest";
import type { IShoppingMallOrderSellerProfileSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSellerProfileSnapshots";
import type { IShoppingMallOrderStatusLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderStatusLog";
import type { IShoppingMallOrderVariantSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderVariantSnapshots";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_order_items_refund_request_create } from "../../../generate/generate_random_shopping_mall_customer_order_items_refund_request_create";
import { prepare_random_shopping_mall_order_refund_request } from "../../../prepare/prepare_random_shopping_mall_order_refund_request";

export async function test_api_customer_refund_request_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer and get order with delivered item
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<
        string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">
      >(),
      password: "12345678",
      href: "https://example.com/join",
      referrer: "https://example.com/home",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // Create order with delivered item using customer connection
  const customerAuthConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerAuthConnection, {
    body: {
      email: customer.email,
      password: "12345678",
      href: "https://example.com/login",
      referrer: "https://example.com/home",
    } satisfies IShoppingMallCustomer.ILogin,
  });
  // Get order with delivered items
  const order = await api.functional.shoppingMall.customer.orders.at(
    customerAuthConnection,
    { orderId: "test-order-id" },
  );
  typia.assert(order);
  // Get order items
  const orderItems = order.orderItems;
  if (orderItems.length === 0) {
    throw new Error("No order items found for testing");
  }
  // Find a delivered order item
  const deliveredItem = orderItems.find(
    (item: IShoppingMallOrderItem) => item.itemStatus === "delivered",
  );
  if (!deliveredItem) {
    throw new Error("No delivered order item found for testing");
  }
  // 2. Create refund request for the delivered item
  const refundRequest =
    await api.functional.shoppingMall.customer.order_items.refund_request.create(
      customerAuthConnection,
      {
        itemId: deliveredItem.id,
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IShoppingMallOrderRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest);
  // 3. Validate refund request
  TestValidator.equals(
    "customer matches",
    refundRequest.customer.id,
    customer.id,
  );
  TestValidator.equals(
    "order item matches",
    refundRequest.orderItem.id,
    deliveredItem.id,
  );
  TestValidator.equals("status is pending", refundRequest.status, "pending");
  TestValidator.notEquals("reason is not empty", refundRequest.reason, "");
}
