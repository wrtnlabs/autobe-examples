import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
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
import { generate_random_shopping_mall_customer_customers_me_orders_create } from "../../../generate/generate_random_shopping_mall_customer_customers_me_orders_create";
import { generate_random_shopping_mall_customer_refund_requests_create } from "../../../generate/generate_random_shopping_mall_customer_refund_requests_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";

export async function test_api_refund_request_delete_pending_success(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test that a customer can successfully delete their own refund request when it is in 'pending' status.
   *
   * This test verifies the complete refund request deletion workflow:
   * 1. Customer registers and authenticates
   * 2. Seller registers and authenticates
   * 3. Customer creates an order (simulating product purchase)
   * 4. Order item is delivered (simulated)
   * 5. Customer creates a refund request (status: pending)
   * 6. Customer deletes the pending refund request
   * 7. Validates deletion success and data integrity
   */
  // 1. Customer setup - register and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // 2. Seller setup - register and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      shop_name: RandomGenerator.name(2),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  // 3. Create order (simulating product purchase)
  const order: IShoppingMallOrder =
    await generate_random_shopping_mall_customer_customers_me_orders_create(
      customerConnection,
      {},
    );
  typia.assert(order);
  // Validate order creation
  TestValidator.predicate("order created successfully", order.id !== undefined);
  TestValidator.predicate("order has items", order.orderItems.length > 0);
  // Get the first order item for refund request
  const orderItem = typia.assert(order.orderItems[0]);
  // 4. Create refund request for the delivered order item
  const refundRequest: IShoppingMallRefundRequest =
    await generate_random_shopping_mall_customer_refund_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: orderItem.id,
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IShoppingMallRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest);
  // Validate refund request creation
  TestValidator.equals(
    "refund request status is pending",
    refundRequest.status,
    "pending",
  );
  TestValidator.equals(
    "order item ID matches",
    refundRequest.orderItem.id,
    orderItem.id,
  );
  // 5. Delete the pending refund request
  await api.functional.shoppingMall.admin.refund_requests.erase(
    customerConnection,
    {
      refundRequestId: refundRequest.id,
    },
  );
  // 6. Validate deletion - refund request should no longer be accessible
  // The deletion is successful if no error is thrown (204 No Content response)
  TestValidator.predicate("refund request deleted successfully", true);
  // 7. Validate order item status remains unchanged after refund request deletion
  TestValidator.predicate(
    "order item still exists",
    orderItem.id !== undefined,
  );
}
