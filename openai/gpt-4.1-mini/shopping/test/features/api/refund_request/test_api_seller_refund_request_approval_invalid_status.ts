import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_order_items_create } from "../../../generate/generate_random_shopping_mall_customer_order_items_create";
import { generate_random_shopping_mall_customer_refund_requests_create } from "../../../generate/generate_random_shopping_mall_customer_refund_requests_create";
import { prepare_random_shopping_mall_order_item } from "../../../prepare/prepare_random_shopping_mall_order_item";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";

export async function test_api_seller_refund_request_approval_invalid_status(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Scenario:
   * 1. Register and login as a seller.
   * 2. Register and login as a customer.
   * 3. Create an order item by the customer with status "delivered".
   * 4. Customer creates a refund request for the delivered order item.
   * 5. Seller approves the refund request (valid first approval).
   * 6. Second approval attempt returns 400 error because status is not "pending".
   * 7. Create another refund request for the same delivered order item.
   * 8. Since no reject API available, skip testing rejection followed by approve.
   */
  // 1. Seller join and login
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "ComplexPass123!",
      shopName: "Seller Shop",
      shopDescription: null,
      logoUri: null,
    },
  });
  typia.assert(sellerAuthorized);
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const sellerLoggedIn = await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerAuthorized.email,
      password: "ComplexPass123!",
    },
  });
  typia.assert(sellerLoggedIn);
  // 2. Customer join and login
  const customerJoinConnection: api.IConnection = { host: connection.host };
  const customerAuthorized = await authorize_customer_join(
    customerJoinConnection,
    {},
  );
  typia.assert(customerAuthorized);
  const customerLoginConnection: api.IConnection = { host: connection.host };
  const customerLoggedIn = await authorize_customer_login(
    customerLoginConnection,
    {
      body: {
        email: customerAuthorized.email,
        password: "ComplexPass123!",
      },
    },
  );
  typia.assert(customerLoggedIn);
  // 3. Customer creates an order item with status "delivered"
  const orderItem =
    await generate_random_shopping_mall_customer_order_items_create(
      customerLoginConnection,
      { body: { quantity: 1, status: "delivered" } },
    );
  typia.assert(orderItem);
  // 4. Customer creates a refund request for the delivered order item
  const refundRequest =
    await generate_random_shopping_mall_customer_refund_requests_create(
      customerLoginConnection,
      {
        body: {
          shoppingMallOrderItemId: orderItem.id,
          requestReason: "Defective item",
        },
      },
    );
  typia.assert(refundRequest);
  // 5. Seller approves the refund request (valid first approval)
  const approvedRefund =
    await api.functional.shoppingMall.seller.refund_requests.approve.approveRefundRequest(
      sellerLoginConnection,
      { refundRequestId: refundRequest.id },
    );
  typia.assert(approvedRefund);
  // 6. Second approval call should fail due to status not "pending"
  await TestValidator.httpError(
    "reject approval on non-pending status (approved)",
    400,
    async () => {
      await api.functional.shoppingMall.seller.refund_requests.approve.approveRefundRequest(
        sellerLoginConnection,
        { refundRequestId: refundRequest.id },
      );
    },
  );
  // 7. Create another refund request to test rejecting then approving (skipped)
  const refundRequest2 =
    await generate_random_shopping_mall_customer_refund_requests_create(
      customerLoginConnection,
      {
        body: {
          shoppingMallOrderItemId: orderItem.id,
          requestReason: "Changed mind",
        },
      },
    );
  typia.assert(refundRequest2);
  // 8. No reject API to simulate status change to 'rejected', so skip reject then approve test
}
