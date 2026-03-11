import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_cancellation_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_cancellation_requests_create";
import { prepare_random_ecommerce_mall_cancellation_request } from "../../../prepare/prepare_random_ecommerce_mall_cancellation_request";

export async function test_api_customer_cancellation_requests_after_rejection_and_resubmission(
  connection: api.IConnection,
): Promise<void> {
  // Test customer's ability to view cancellation requests after rejection and resubmit a new request for the same order item.
  // 1. Customer joins/register to create an account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {
      body: {
        email: typia.random<string>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies IEcommerceMallCustomer.IJoin,
    });
  typia.assert(customer);
  // 2. Generate a paid order item for cancellation (prerequisite)
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const paidOrderItem: IEcommerceMallOrderItem.ISummary = {
    id: orderItemId,
    item_status: "paid",
    quantity: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    unit_price: typia.random<number>(),
    product_snapshot: { name: "Test Product" },
    variant_snapshot: { sku: "TEST-SKU" },
    seller_profile_snapshot: { shop_name: "Test Shop" },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  };
  // 3. Customer creates first cancellation request with reason: "Item arrived damaged"
  const firstCancellationRequest: IEcommerceMallCancellationRequest =
    await generate_random_ecommerce_mall_customer_cancellation_requests_create(
      customerConnection,
      {
        body: {
          order_item_id: orderItemId,
          reason: "Item arrived damaged",
        } satisfies IEcommerceMallCancellationRequest.ICreate,
      },
    );
  typia.assert(firstCancellationRequest);
  // 4. Customer sends PATCH request to retrieve cancellation requests and verify first request was created with status=pending
  const firstListResponse: IPageIEcommerceMallCancellationRequest.ISummary =
    await api.functional.ecommerceMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {} satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(firstListResponse);
  // Verify first request appears in list with pending status
  TestValidator.equals(
    "first request in list with pending status",
    firstListResponse.data.some(
      (req) =>
        req.orderItem.id === orderItemId &&
        req.reason === "Item arrived damaged" &&
        req.request_status === "pending",
    ),
    true,
  );
  // 5. Simulate seller rejecting the cancellation request (external system action)
  // Note: Seller rejection changes status to rejected with rejection reason
  // In E2E test, we acknowledge this is external and proceed to test resubmission
  const rejectedRequest: IEcommerceMallCancellationRequest = {
    ...firstCancellationRequest,
    requestStatus: "rejected",
    updatedAt: new Date().toISOString(),
  };
  // 6. Customer sends PATCH request to retrieve cancellation requests and verify:
  // - The original request shows status=rejected
  // - The cancellation request is still in their list
  const secondListResponse: IPageIEcommerceMallCancellationRequest.ISummary =
    await api.functional.ecommerceMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {} satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(secondListResponse);
  // Verify rejected request is still in list (simulated)
  TestValidator.equals(
    "rejected request in list",
    secondListResponse.data.some(
      (req) =>
        req.orderItem.id === orderItemId &&
        req.reason === "Item arrived damaged" &&
        req.request_status === "rejected",
    ),
    true,
  );
  // 7. Customer submits new cancellation request for the same order item with reason: "Item quality issue, needs replacement"
  const secondCancellationRequest: IEcommerceMallCancellationRequest =
    await generate_random_ecommerce_mall_customer_cancellation_requests_create(
      customerConnection,
      {
        body: {
          order_item_id: orderItemId,
          reason: "Item quality issue, needs replacement",
        } satisfies IEcommerceMallCancellationRequest.ICreate,
      },
    );
  typia.assert(secondCancellationRequest);
  // 8. Customer sends PATCH request to retrieve cancellation requests and verify:
  const thirdListResponse: IPageIEcommerceMallCancellationRequest.ISummary =
    await api.functional.ecommerceMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {} satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(thirdListResponse);
  // Verify both rejected request and new pending request appear in the list
  const cancelledRequests = thirdListResponse.data.filter(
    (req) => req.orderItem.id === orderItemId,
  );
  TestValidator.equals("both requests in list", cancelledRequests.length, 2);
  // Verify each cancellation request has a unique ID
  const uniqueIds = new Set(cancelledRequests.map((req) => req.id));
  TestValidator.equals("unique IDs for each request", uniqueIds.size, 2);
  // Verify one is rejected and one is pending
  const statuses = cancelledRequests.map((req) => req.request_status);
  TestValidator.equals(
    "one rejected and one pending status",
    statuses.includes("rejected") && statuses.includes("pending"),
    true,
  );
  // Verify requests are sorted by creation date (newest first)
  TestValidator.equals(
    "requests sorted by creation date (newest first)",
    cancelledRequests[0].created_at >= cancelledRequests[1].created_at,
    true,
  );
  // 9. Verify that the system tracks multiple submissions for the same item
  TestValidator.equals(
    "system tracks multiple submissions for same item",
    cancelledRequests.length,
    2,
  );
  // Validate cancellation request summaries include all required fields
  TestValidator.equals(
    "summary has id field",
    cancelledRequests.every((req) => req.id !== undefined),
    true,
  );
  TestValidator.equals(
    "summary has customer field",
    cancelledRequests.every((req) => req.customer !== undefined),
    true,
  );
  TestValidator.equals(
    "summary has orderItem field",
    cancelledRequests.every((req) => req.orderItem !== undefined),
    true,
  );
  TestValidator.equals(
    "summary has reason field",
    cancelledRequests.every((req) => req.reason !== undefined),
    true,
  );
  TestValidator.equals(
    "summary has request_status field",
    cancelledRequests.every((req) => req.request_status !== undefined),
    true,
  );
  TestValidator.equals(
    "summary has created_at field",
    cancelledRequests.every((req) => req.created_at !== undefined),
    true,
  );
  TestValidator.equals(
    "summary has updated_at field",
    cancelledRequests.every((req) => req.updated_at !== undefined),
    true,
  );
  // Verify customer context and order item context are correctly included in summaries
  TestValidator.equals(
    "customer context included",
    cancelledRequests.every((req) => req.customer.id !== undefined),
    true,
  );
  TestValidator.equals(
    "orderItem context included",
    cancelledRequests.every((req) => req.orderItem.id !== undefined),
    true,
  );
}