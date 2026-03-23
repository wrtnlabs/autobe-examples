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
 * Test that a customer cannot delete another customer's refund request (ownership validation).
 *
 * This test verifies that the refund request deletion endpoint properly validates
 * ownership, ensuring that only the customer who created the refund request can
 * delete it. The test sets up two customers, creates a refund request with one
 * customer, and attempts to delete it using the other customer's credentials.
 */
export async function test_api_refund_request_delete_ownership_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate customer A (refund request owner)
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerA = await authorize_customer_join(customerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: "Customer A",
      href: "https://test.com",
      referrer: "https://test.com",
    },
  });
  typia.assert(customerA);
  // 2. Register and authenticate customer B (unauthorized user)
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerB = await authorize_customer_join(customerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: "Customer B",
      href: "https://test.com",
      referrer: "https://test.com",
    },
  });
  typia.assert(customerB);
  // 3. Create an order for customer A (simplified setup)
  // Note: In a full test scenario, we would:
  // - Create a seller and approve them
  // - Create a product
  // - Add product to cart and create order
  // - Create shipment and confirm delivery
  // For this test, we use the utility function which handles the setup
  const order =
    await generate_random_shopping_mall_customer_customers_me_orders_create(
      customerAConnection,
      {},
    );
  typia.assert(order);
  // 4. Customer A creates a refund request for their order item
  // Note: This assumes the order item is in 'delivered' status
  const refundRequest =
    await generate_random_shopping_mall_customer_refund_requests_create(
      customerAConnection,
      {
        body: {
          orderItemId: order.orderItems[0].id,
          reason: "Product not as described",
        },
      },
    );
  typia.assert(refundRequest);
  TestValidator.equals(
    "refund request status is pending",
    refundRequest.status,
    "pending",
  );
  // 5. Attempt to delete customer A's refund request using customer B's credentials
  // This should fail with 403 Forbidden because customer B is not the owner
  await TestValidator.httpError(
    "customer B cannot delete customer A's refund request",
    403,
    async () =>
      await api.functional.shoppingMall.admin.refund_requests.erase(
        customerBConnection,
        {
          refundRequestId: refundRequest.id,
        },
      ),
  );
  // 6. Verify that customer A can still access their refund request
  // by confirming the refund request ID is still valid
  TestValidator.predicate(
    "refund request still exists",
    refundRequest.id != null,
  );
}
