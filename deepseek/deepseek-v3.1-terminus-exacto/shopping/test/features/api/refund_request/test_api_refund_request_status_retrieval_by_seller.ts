import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequest";
import type { IEcommerceRefundRequestStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequestStatus";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceRefundRequestStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceRefundRequestStatus";
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
import { generate_random_ecommerce_customer_refund_requests_create } from "../../../generate/generate_random_ecommerce_customer_refund_requests_create";
import { prepare_random_ecommerce_refund_request } from "../../../prepare/prepare_random_ecommerce_refund_request";

/**
 * Test successful retrieval of a specific refund request status history entry by an authenticated seller.
 * The scenario validates that sellers can access status history entries for refund requests
 * associated with their products. Create a refund request with multiple status transitions
 * (pending → approved → completed) and verify that retrieving a specific status entry returns
 * the correct status value, timestamp, and optional reason.
 */
export async function test_api_refund_request_status_retrieval_by_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(seller);
  TestValidator.predicate(
    "seller should be authorized",
    () => seller.token.access.length > 0,
  );
  // 2. Create customer account and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
    },
  });
  typia.assert(customer);
  TestValidator.predicate(
    "customer should be authorized",
    () => customer.token.access.length > 0,
  );
  // 3. Create refund request using utility function (handles order item setup internally)
  const refundRequest =
    await generate_random_ecommerce_customer_refund_requests_create(
      customerConnection,
      { body: undefined },
    );
  typia.assert(refundRequest);
  TestValidator.equals(
    "refund request belongs to seller",
    refundRequest.seller.id,
    seller.id,
  );
  // 4. Seller creates first status: approved
  const approvedStatusUpdate = {
    decision: "approved" as const,
    reason: "Refund approved after review",
  };
  const firstStatusResponse =
    await api.functional.ecommerce.seller.refund_requests.statuses.updateStatus(
      sellerConnection,
      {
        refundRequestId: refundRequest.id,
        body: approvedStatusUpdate,
      },
    );
  typia.assert(firstStatusResponse);
  // Find the approved status in the response
  const approvedStatus = firstStatusResponse.data.find(
    (s) => s.status === "approved",
  );
  TestValidator.predicate(
    "approved status should exist",
    () => approvedStatus !== undefined,
  );
  const firstStatusId = approvedStatus!.id;
  // 5. Seller creates second status: rejected
  const rejectedStatusUpdate = {
    decision: "rejected" as const,
    reason: "Refund rejected due to policy violation",
  };
  const secondStatusResponse =
    await api.functional.ecommerce.seller.refund_requests.statuses.updateStatus(
      sellerConnection,
      {
        refundRequestId: refundRequest.id,
        body: rejectedStatusUpdate,
      },
    );
  typia.assert(secondStatusResponse);
  // Find the rejected status in the response
  const rejectedStatus = secondStatusResponse.data.find(
    (s) => s.status === "rejected",
  );
  TestValidator.predicate(
    "rejected status should exist",
    () => rejectedStatus !== undefined,
  );
  const secondStatusId = rejectedStatus!.id;
  // 6. Retrieve the first status entry
  const retrievedStatus =
    await api.functional.ecommerce.seller.refund_requests.statuses.at(
      sellerConnection,
      {
        refundRequestId: refundRequest.id,
        statusId: firstStatusId,
      },
    );
  typia.assert(retrievedStatus);
  // 7. Validate the retrieved status
  TestValidator.equals("status id matches", retrievedStatus.id, firstStatusId);
  TestValidator.equals(
    "status value is approved",
    retrievedStatus.status,
    "approved",
  );
  TestValidator.predicate(
    "has created_at timestamp",
    () => retrievedStatus.created_at !== undefined,
  );
  TestValidator.equals(
    "reason matches",
    retrievedStatus.reason,
    "Refund approved after review",
  );
  // 8. Retrieve the second status entry
  const retrievedStatus2 =
    await api.functional.ecommerce.seller.refund_requests.statuses.at(
      sellerConnection,
      {
        refundRequestId: refundRequest.id,
        statusId: secondStatusId,
      },
    );
  typia.assert(retrievedStatus2);
  // 9. Validate the second retrieved status
  TestValidator.equals(
    "second status id matches",
    retrievedStatus2.id,
    secondStatusId,
  );
  TestValidator.equals(
    "second status value is rejected",
    retrievedStatus2.status,
    "rejected",
  );
  TestValidator.predicate(
    "second has created_at timestamp",
    () => retrievedStatus2.created_at !== undefined,
  );
  TestValidator.equals(
    "second reason matches",
    retrievedStatus2.reason,
    "Refund rejected due to policy violation",
  );
  // 10. Validate statuses are different
  TestValidator.notEquals(
    "status ids are different",
    retrievedStatus.id,
    retrievedStatus2.id,
  );
  TestValidator.notEquals(
    "status values are different",
    retrievedStatus.status,
    retrievedStatus2.status,
  );
}
