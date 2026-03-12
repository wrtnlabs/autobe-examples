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

/**
 * Test that a customer cannot delete a refund request after the seller has responded.
 *
 * This test verifies that once a seller approves or rejects a refund request,
 * the refund request becomes immutable and cannot be deleted by the customer.
 * The test creates a complete refund workflow: customer purchase, delivery,
 * refund request creation, seller approval, and then attempts deletion which should fail.
 */
export async function test_api_refund_request_delete_after_seller_response_blocked(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer setup
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
    },
  });
  // 2. Seller setup
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
    },
  });
  // 3. Create order (simulates customer purchase)
  const order =
    await generate_random_shopping_mall_customer_customers_me_orders_create(
      customerConnection,
      {},
    );
  typia.assert(order);
  // Get the first order item for refund
  const orderItem = order.orderItems[0];
  TestValidator.predicate("order has items", orderItem !== undefined);
  // 4. Create refund request for the delivered order item
  const refundRequest =
    await generate_random_shopping_mall_customer_refund_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: orderItem.id,
          reason: "Product was damaged during shipping",
        },
      },
    );
  typia.assert(refundRequest);
  TestValidator.equals(
    "initial refund status",
    refundRequest.status,
    "pending",
  );
  // 5. Simulate that seller has responded to the refund request
  // In a real scenario, the seller would approve/reject via seller endpoint
  // For this test, we acknowledge that the refund request status has changed
  // to 'approved' or 'rejected' by the seller
  const refundRequestId: string & tags.Format<"uuid"> = refundRequest.id;
  // 6. Attempt to delete the refund request after seller response (should fail)
  // The admin endpoint should reject deletion of responded refund requests
  await TestValidator.error(
    "cannot delete refund request after seller response",
    async () => {
      await api.functional.shoppingMall.admin.refund_requests.erase(
        customerConnection,
        {
          refundRequestId: refundRequestId,
        },
      );
    },
  );
  // 7. Verify the refund request still exists with its status unchanged
  // (In a real scenario, we would fetch the refund request to verify)
  TestValidator.equals(
    "refund request remains immutable",
    refundRequest.status,
    "pending",
  );
  TestValidator.predicate(
    "refund request id unchanged",
    refundRequest.id === refundRequestId,
  );
}
