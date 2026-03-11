import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_ecommerce_mall_customer_refund_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_refund_requests_create";
import { prepare_random_ecommerce_mall_refund_request } from "../../../prepare/prepare_random_ecommerce_mall_refund_request";

export async function test_api_refund_request_retrieval_status_change_snapshot_preservation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer and seller accounts
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // Since product and order creation endpoints are not available in the provided API,
  // we'll use placeholder UUIDs for the refund request
  const placeholderOrderId = typia.random<string & tags.Format<"uuid">>();
  const placeholderOrderItemId = typia.random<string & tags.Format<"uuid">>();
  // 3. Customer creates refund request with status=pending
  const refundRequest =
    await api.functional.ecommerceMall.customer.refund_requests.create(
      customerConnection,
      {
        body: {
          order_item_id: placeholderOrderItemId,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEcommerceMallRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest);
  TestValidator.equals(
    "initial status is pending",
    refundRequest.status,
    "pending",
  );
  // 4. Seller approves the refund request (status change to approved)
  const approvedRequest =
    await api.functional.ecommerceMall.seller.orders.items.refund.approve.approveRefund(
      sellerConnection,
      {
        orderId: placeholderOrderId,
        orderItemId: placeholderOrderItemId,
      },
    );
  typia.assert(approvedRequest);
  TestValidator.equals(
    "status changed to approved",
    approvedRequest.status,
    "approved",
  );
  TestValidator.predicate(
    "has responded_at timestamp",
    approvedRequest.responded_at !== null,
  );
  // 5. Customer retrieves the refund request after status change
  const retrievedRequest =
    await api.functional.ecommerceMall.customer.refund_requests.at(
      customerConnection,
      {
        refundRequestId: refundRequest.id,
      },
    );
  typia.assert(retrievedRequest);
  // 6. Verify snapshot preservation
  TestValidator.equals("status preserved", retrievedRequest.status, "approved");
  TestValidator.equals(
    "responded_at preserved",
    retrievedRequest.responded_at,
    approvedRequest.responded_at,
  );
  // Verify nested entities exist (they should have snapshot data)
  typia.assert(retrievedRequest.orderItem);
  typia.assert(retrievedRequest.seller);
  typia.assert(retrievedRequest.customer);
  // Validate snapshot fields exist
  TestValidator.predicate(
    "order item has product name",
    typeof retrievedRequest.orderItem.product_name === "string",
  );
  TestValidator.predicate(
    "order item has variant options",
    typeof retrievedRequest.orderItem.variant_options === "string",
  );
  TestValidator.predicate(
    "order item has product price",
    typeof retrievedRequest.orderItem.product_price === "number",
  );
}
