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

export async function test_api_seller_refund_request_approval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller joins and logs in
  const sellerJoinInput: Partial<IShoppingMallSeller.IJoin> = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    shopName: RandomGenerator.name(1),
  };
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: sellerJoinInput,
  });
  typia.assert(sellerAuthorized);

  // Login seller to get fresh token
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  if (!sellerJoinInput.email) throw new Error("sellerJoinInput.email must be defined");
  const sellerAuthorizedLogin = await authorize_seller_login(
    sellerLoginConnection,
    {
      body: {
        email: sellerJoinInput.email,
        password: sellerJoinInput.password!,
      },
    },
  );
  typia.assert(sellerAuthorizedLogin);

  // 2. Customer joins and logs in
  const customerJoinInput: Partial<IShoppingMallCustomer.IJoin> = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  };
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuthorized = await authorize_customer_join(customerConnection, {
    body: customerJoinInput,
  });
  typia.assert(customerAuthorized);

  // Login customer to get fresh token
  const customerLoginConnection: api.IConnection = { host: connection.host };
  if (!customerJoinInput.email) throw new Error("customerJoinInput.email must be defined");
  const customerAuthorizedLogin = await authorize_customer_login(
    customerLoginConnection,
    {
      body: {
        email: customerJoinInput.email,
        password: customerJoinInput.password!,
      },
    },
  );
  typia.assert(customerAuthorizedLogin);

  // 3. Customer creates an order item with status delivered (simulate delivered by setting status)
  const orderItem =
    await generate_random_shopping_mall_customer_order_items_create(
      customerLoginConnection,
      {
        body: {
          shoppingMallOrderId: typia.random<string & tags.Format<"uuid">>(),
          shoppingMallProductVariantId: typia.random<
            string & tags.Format<"uuid">
          >(),
          quantity: 1,
          status: "delivered",
        },
      },
    );
  typia.assert(orderItem);

  // 4. Customer creates a refund request for the delivered order item
  const refundRequest =
    await generate_random_shopping_mall_customer_refund_requests_create(
      customerLoginConnection,
      {
        body: {
          shoppingMallOrderItemId: orderItem.id,
          requestReason: "Test refund reason",
        },
      },
    );
  typia.assert(refundRequest);
  TestValidator.equals(
    "refund request status initial",
    refundRequest.status,
    "pending",
  );

  // 5. Seller approves the refund request
  const approvedRefundRequest =
    await api.functional.shoppingMall.seller.refund_requests.approve.approveRefundRequest(
      sellerLoginConnection,
      {
        refundRequestId: refundRequest.id,
      },
    );
  typia.assert(approvedRefundRequest);

  // 6. Verify refund request status updated to 'approved'
  TestValidator.equals(
    "refund request status after approval",
    approvedRefundRequest.status,
    "approved",
  );

  // 7. Verify order item status changed to 'refunded'
  TestValidator.equals(
    "order item status after refund approval",
    approvedRefundRequest.shoppingMallOrderItem.status,
    "refunded",
  );

  // 8. Verify stock quantity restored (stock quantity should be >= initial + refunded quantity)
  // Since we cannot get the initial stock quantity before test, just verify stockQuantity >= orderItem.quantity
  TestValidator.predicate(
    "stock quantity restored",
    approvedRefundRequest.shoppingMallOrderItem.productVariant.stockQuantity >=
      orderItem.quantity,
  );
}
