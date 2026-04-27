import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCancellationRequest";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import type { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
import type { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
import type { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import type { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallCancellationRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test that an authenticated customer can filter their cancellation requests by status.
 *
 * Validates the status filter functionality of the customer cancellation requests index endpoint. After customer authentication, the test calls the endpoint with various status filter arrays and verifies that all returned items match the requested statuses.
 *
 * Four filter scenarios are tested: single-status filters for `pending`, `approved`, and `rejected`, plus a multi-status filter combining `pending` and `approved`. Response structure is validated via typia.assert, and pagination metadata is verified for correctness.
 *
 * 1. A customer account is created using the authorize_customer_join utility.
 * 2. The index endpoint is called with `status: ['pending']` — every returned item must have status "pending".
 * 3. The index endpoint is called with `status: ['approved']` — every returned item must have status "approved".
 * 4. The index endpoint is called with `status: ['rejected']` — every returned item must have status "rejected".
 * 5. The index endpoint is called with `status: ['pending', 'approved']` — every returned item must have status "pending" or "approved".
 * 6. Pagination parameters (page, limit) are included alongside the status filter to verify combined functionality.
 */
export async function test_api_customer_cancellation_requests_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  //----
  // 1. Customer authentication
  //----
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  //----
  // 2. Filter by 'pending' status
  //----
  const pendingPage: IPageIECommerceMallCancellationRequest.ISummary =
    await api.functional.eCommerceMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {
          status: ["pending"],
        } satisfies IECommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(pendingPage);
  for (const item of pendingPage.data) {
    TestValidator.equals("status is pending", item.status, "pending");
  }
  //----
  // 3. Filter by 'approved' status
  //----
  const approvedPage: IPageIECommerceMallCancellationRequest.ISummary =
    await api.functional.eCommerceMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {
          status: ["approved"],
        } satisfies IECommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(approvedPage);
  for (const item of approvedPage.data) {
    TestValidator.equals("status is approved", item.status, "approved");
  }
  //----
  // 4. Filter by 'rejected' status
  //----
  const rejectedPage: IPageIECommerceMallCancellationRequest.ISummary =
    await api.functional.eCommerceMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {
          status: ["rejected"],
        } satisfies IECommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(rejectedPage);
  for (const item of rejectedPage.data) {
    TestValidator.equals("status is rejected", item.status, "rejected");
  }
  //----
  // 5. Filter by multiple statuses (pending + approved)
  //----
  const multiplePage: IPageIECommerceMallCancellationRequest.ISummary =
    await api.functional.eCommerceMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {
          status: ["pending", "approved"],
        } satisfies IECommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(multiplePage);
  for (const item of multiplePage.data) {
    TestValidator.predicate(
      "status is pending or approved",
      item.status === "pending" || item.status === "approved",
    );
  }
  //----
  // 6. Test with pagination parameters combined with status filter
  //----
  const paginatedPage: IPageIECommerceMallCancellationRequest.ISummary =
    await api.functional.eCommerceMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {
          status: ["pending", "approved", "rejected"],
          page: 1,
          limit: 10,
        } satisfies IECommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(paginatedPage);
  TestValidator.predicate(
    "pagination current is 1",
    paginatedPage.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 10",
    paginatedPage.pagination.limit === 10,
  );
  TestValidator.predicate(
    "data length does not exceed limit",
    paginatedPage.data.length <= paginatedPage.pagination.limit,
  );
  for (const item of paginatedPage.data) {
    TestValidator.predicate(
      "status is in filter set",
      item.status === "pending" ||
        item.status === "approved" ||
        item.status === "rejected",
    );
  }
}
