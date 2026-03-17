import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
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

export async function test_api_seller_refund_request_approval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create seller account and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller: IEcommerceMallSeller.IAuthorized = await authorize_seller_join(
    sellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallSeller.IJoin,
    },
  );
  typia.assert(seller);
  // 2. Setup: Create customer account and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customer: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallCustomer.IJoin,
    });
  typia.assert(customer);
  // 3. Customer creates a refund request for a delivered order item
  //    Using utility function which handles the order item prerequisite
  const refundRequestId = typia.random<string & tags.Format<"uuid">>();
  const deliveredOrderItemId = typia.random<string & tags.Format<"uuid">>();
  const refundRequest: IEcommerceMallRefundRequest =
    await generate_random_ecommerce_mall_customer_refund_requests_create(
      customerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
        params: { orderItemId: deliveredOrderItemId },
      },
    );
  typia.assert(refundRequest);
  // 4. Seller approves the refund request
  const approvedRefundRequest: IEcommerceMallRefundRequest =
    await api.functional.ecommerceMall.seller.refund_requests.approve(
      sellerConnection,
      {
        refundRequestId: refundRequest.id,
        body: {
          action: "approve",
        } satisfies IEcommerceMallRefundRequest.IApproval,
      },
    );
  typia.assert(approvedRefundRequest);
  // 5. Validate refund request status is 'approved'
  TestValidator.equals(
    "refund request status approved",
    approvedRefundRequest.status,
    "approved",
  );
  // 6. Validate decision timestamp is set after approval
  TestValidator.predicate(
    "decision_at timestamp exists after approval",
    approvedRefundRequest.decisionAt !== null,
  );
  // 7. Validate order item status is 'refunded'
  TestValidator.equals(
    "order item status refunded",
    approvedRefundRequest.orderItem.status,
    "refunded",
  );
  // 8. Validate customer matches original refund request
  TestValidator.equals(
    "customer matches original refund request",
    approvedRefundRequest.customer.id,
    refundRequest.customer.id,
  );
}