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

/**
 * Test seller rejection of a pending customer refund request.
 *
 * Flow:
 * 1. Customer registers and creates a refund request for a delivered order item
 * 2. Seller registers and rejects the pending refund request
 * 3. Validate status changes to 'rejected' and validation is recorded
 */
export async function test_api_seller_refund_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration
  const customerJoinConnection: api.IConnection = { host: connection.host };
  const customerJoinResult = await authorize_customer_join(
    customerJoinConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallCustomer.IJoin,
    },
  );
  typia.assert(customerJoinResult);
  // 2. Customer login with actual password
  const customerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerLoginConnection, {
    body: {
      email: customerJoinResult.email,
      password: "Customer123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallCustomer.ILogin,
  });
  // 3. Generate order item ID for refund request creation
  // Note: The system requires an existing delivered order item
  const orderItemId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Customer creates refund request for the order item
  const refundRequest =
    await api.functional.ecommerceMall.customer.refund_requests.create(
      customerLoginConnection,
      {
        orderItemId,
        body: {
          reason:
            "Product received is defective and does not match the description",
        } satisfies IEcommerceMallRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest);
  // Validate refund request was created with 'pending' status
  TestValidator.equals(
    "refund request status is pending",
    refundRequest.status,
    "pending",
  );
  TestValidator.equals(
    "refund request reason is set",
    refundRequest.reason,
    "Product received is defective and does not match the description",
  );
  TestValidator.equals(
    "seller response is initially null",
    refundRequest.sellerResponse,
    null,
  );
  // 5. Seller registration
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerJoinResult = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // 6. Seller login
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerJoinResult.email,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // 7. Seller rejects the pending refund request
  const rejectionReason =
    "Product condition does not justify refund request per return policy";
  const rejectedRefundRequest =
    await api.functional.ecommerceMall.seller.refund_requests.reject(
      sellerLoginConnection,
      {
        refundRequestId: refundRequest.id,
        body: {
          rejection_reason: rejectionReason,
        } satisfies IEcommerceMallRefundRequest.IReject,
      },
    );
  typia.assert(rejectedRefundRequest);
  // 8. Validate refund request status changed to 'rejected'
  TestValidator.equals(
    "refund request status changed to rejected",
    rejectedRefundRequest.status,
    "rejected",
  );
  // 9. Validate rejection reason is recorded in both fields
  TestValidator.equals(
    "rejection_reason field contains seller explanation",
    rejectedRefundRequest.rejectionReason,
    rejectionReason,
  );
  TestValidator.equals(
    "seller_response contains rejection reason",
    rejectedRefundRequest.sellerResponse,
    rejectionReason,
  );
  // 10. Validate decision_at timestamp is set
  TestValidator.predicate(
    "decision_at timestamp is set after rejection",
    () => rejectedRefundRequest.decisionAt !== null,
  );
  // 11. Validate order item status remains 'delivered'
  TestValidator.predicate(
    "order item status remains delivered after refund rejection",
    () => refundRequest.orderItem.status === "delivered",
  );
  // 12. Validate seller identity is associated with refund request
  TestValidator.equals(
    "refund request customer is the original customer",
    refundRequest.customer.id,
    customerJoinResult.id,
  );
}
