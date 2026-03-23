import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequest";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
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

export async function test_api_customer_cancellation_requests_list_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test customer cancellation requests list with pagination.
   * Validates that authenticated customers can retrieve paginated cancellation requests
   * with proper filtering and sorting capabilities.
   *
   * Note: This test validates the pagination and filtering functionality.
   * In a fresh test environment, cancellation requests may not exist,
   * so the data array may be empty. The test validates the response
   * structure and pagination metadata regardless of data presence.
   */
  // 1. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
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
  typia.assert(customerAuth);
  // Store customer ID for ownership validation
  const customerId = customerAuth.id;
  // 2. Test default pagination (page=1, limit=20)
  const defaultPage: IPageIShoppingMallCancellationRequest.ISummary =
    await api.functional.shoppingMall.customer.cancellationRequests.index(
      customerConnection,
      {
        body: {} satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(defaultPage);
  // Validate pagination metadata
  TestValidator.equals(
    "default page number",
    defaultPage.pagination.current,
    1,
  );
  TestValidator.equals("default limit", defaultPage.pagination.limit, 20);
  TestValidator.predicate(
    "records count is non-negative",
    defaultPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages calculated correctly",
    defaultPage.pagination.pages ===
      Math.ceil(defaultPage.pagination.records / defaultPage.pagination.limit),
  );
  // 3. Test with custom pagination parameters
  const customPage: IPageIShoppingMallCancellationRequest.ISummary =
    await api.functional.shoppingMall.customer.cancellationRequests.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(customPage);
  TestValidator.equals("custom page number", customPage.pagination.current, 1);
  TestValidator.equals("custom limit", customPage.pagination.limit, 10);
  // 4. Test with status filter (pending)
  const pendingRequests: IPageIShoppingMallCancellationRequest.ISummary =
    await api.functional.shoppingMall.customer.cancellationRequests.index(
      customerConnection,
      {
        body: {
          status: "pending",
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(pendingRequests);
  // All returned requests should have pending status
  await ArrayUtil.asyncForEach(pendingRequests.data, async (request) => {
    TestValidator.equals(
      "request status is pending",
      request.status,
      "pending",
    );
  });
  // 5. Test with status filter (approved)
  const approvedRequests: IPageIShoppingMallCancellationRequest.ISummary =
    await api.functional.shoppingMall.customer.cancellationRequests.index(
      customerConnection,
      {
        body: {
          status: "approved",
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(approvedRequests);
  // All returned requests should have approved status
  await ArrayUtil.asyncForEach(approvedRequests.data, async (request) => {
    TestValidator.equals(
      "request status is approved",
      request.status,
      "approved",
    );
  });
  // 6. Test with status filter (rejected)
  const rejectedRequests: IPageIShoppingMallCancellationRequest.ISummary =
    await api.functional.shoppingMall.customer.cancellationRequests.index(
      customerConnection,
      {
        body: {
          status: "rejected",
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(rejectedRequests);
  // All returned requests should have rejected status
  await ArrayUtil.asyncForEach(rejectedRequests.data, async (request) => {
    TestValidator.equals(
      "request status is rejected",
      request.status,
      "rejected",
    );
  });
  // 7. Test sorting by requested_at descending (newest first)
  const sortedByRequestedDesc: IPageIShoppingMallCancellationRequest.ISummary =
    await api.functional.shoppingMall.customer.cancellationRequests.index(
      customerConnection,
      {
        body: {
          sortBy: "requested_at",
          sortOrder: "desc",
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(sortedByRequestedDesc);
  // Validate sorting: if multiple items exist, they should be in descending order
  if (sortedByRequestedDesc.data.length > 1) {
    for (let i = 1; i < sortedByRequestedDesc.data.length; i++) {
      TestValidator.predicate(
        `item ${i} requested_at <= item ${i - 1} requested_at`,
        new Date(sortedByRequestedDesc.data[i].requestedAt).getTime() <=
          new Date(sortedByRequestedDesc.data[i - 1].requestedAt).getTime(),
      );
    }
  }
  // 8. Test sorting by requested_at ascending (oldest first)
  const sortedByRequestedAsc: IPageIShoppingMallCancellationRequest.ISummary =
    await api.functional.shoppingMall.customer.cancellationRequests.index(
      customerConnection,
      {
        body: {
          sortBy: "requested_at",
          sortOrder: "asc",
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(sortedByRequestedAsc);
  // Validate sorting: if multiple items exist, they should be in ascending order
  if (sortedByRequestedAsc.data.length > 1) {
    for (let i = 1; i < sortedByRequestedAsc.data.length; i++) {
      TestValidator.predicate(
        `item ${i} requested_at >= item ${i - 1} requested_at`,
        new Date(sortedByRequestedAsc.data[i].requestedAt).getTime() >=
          new Date(sortedByRequestedAsc.data[i - 1].requestedAt).getTime(),
      );
    }
  }
  // 9. Test date range filtering
  const now = new Date();
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const filteredByDateRange: IPageIShoppingMallCancellationRequest.ISummary =
    await api.functional.shoppingMall.customer.cancellationRequests.index(
      customerConnection,
      {
        body: {
          requested_at_from: oneMonthAgo.toISOString(),
          requested_at_to: now.toISOString(),
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(filteredByDateRange);
  // All returned requests should be within the date range
  await ArrayUtil.asyncForEach(filteredByDateRange.data, async (request) => {
    const requestedAt = new Date(request.requestedAt).getTime();
    TestValidator.predicate(
      "request is within date range (from)",
      requestedAt >= oneMonthAgo.getTime(),
    );
    TestValidator.predicate(
      "request is within date range (to)",
      requestedAt <= now.getTime(),
    );
  });
  // 10. Validate customer ownership for all returned requests
  await ArrayUtil.asyncForEach(defaultPage.data, async (request) => {
    // Validate that each cancellation request belongs to the authenticated customer
    TestValidator.equals(
      "cancellation request belongs to authenticated customer",
      request.customer.id,
      customerId,
    );
    // Validate business logic: if status is not pending, seller response should exist
    if (request.status !== "pending") {
      TestValidator.predicate(
        "respondedAt is populated for non-pending status",
        request.respondedAt !== null,
      );
      TestValidator.predicate(
        "seller is populated for non-pending status",
        request.seller !== null,
      );
    }
    // Validate business logic: if rejected, rejection reason should exist
    if (request.status === "rejected") {
      TestValidator.predicate(
        "rejectionReason is populated for rejected status",
        request.rejectionReason !== null,
      );
    }
  });
}
