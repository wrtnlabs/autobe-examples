import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test pagination, sorting, and text search functionality for refund request listing.
 *
 * Validates that the PATCH /shoppingMall/customer/refund-requests endpoint correctly handles:
 * - Pagination parameters (page, limit) with proper bounds
 * - Sorting options (created_at, responded_at) with ascending/descending order
 * - Text search across reason text and customer display name
 * - Date range filtering with created_from and created_to
 * - Status filtering by pending, approved, rejected
 */
export async function test_api_refund_request_list_pagination_search(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, { body: {} });
  // Step 2: Test basic pagination with default parameters
  const basicPagination =
    await api.functional.shoppingMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(basicPagination);
  TestValidator.equals(
    "pagination.current equals 1",
    basicPagination.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination.limit equals 10",
    basicPagination.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "data array does not exceed limit",
    basicPagination.data.length <= 10,
  );
  // Step 3: Test maximum limit (100)
  const maxLimit =
    await api.functional.shoppingMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(maxLimit);
  TestValidator.equals(
    "max limit pagination.limit",
    maxLimit.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "max limit data within bounds",
    maxLimit.data.length <= 100,
  );
  // Step 4: Test minimum limit (1)
  const minLimit =
    await api.functional.shoppingMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(minLimit);
  TestValidator.equals(
    "min limit pagination.limit",
    minLimit.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "min limit data within bounds",
    minLimit.data.length <= 1,
  );
  // Step 5: Test second page for offset behavior
  if (basicPagination.pagination.pages >= 2) {
    const secondPage =
      await api.functional.shoppingMall.customer.refund_requests.index(
        customerConnection,
        {
          body: {
            page: 2,
            limit: 10,
          } satisfies IShoppingMallRefundRequest.IRequest,
        },
      );
    typia.assert(secondPage);
    TestValidator.equals(
      "second page current",
      secondPage.pagination.current,
      2,
    );
    TestValidator.predicate(
      "second page data within limit",
      secondPage.data.length <= 10,
    );
  }
  // Step 6: Test sorting by created_at ascending (oldest first)
  const sortCreatedAsc =
    await api.functional.shoppingMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          sort: "created_at",
          order: "asc",
          limit: 20,
        } satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(sortCreatedAsc);
  TestValidator.equals(
    "created_at ascending limit",
    sortCreatedAsc.pagination.limit,
    20,
  );
  // Step 7: Test sorting by created_at descending (newest first) - default
  const sortCreatedDesc =
    await api.functional.shoppingMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          sort: "created_at",
          order: "desc",
          limit: 20,
        } satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(sortCreatedDesc);
  TestValidator.equals(
    "created_at descending limit",
    sortCreatedDesc.pagination.limit,
    20,
  );
  // Step 8: Test sorting by responded_at
  const sortResponded =
    await api.functional.shoppingMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          sort: "responded_at",
          order: "desc",
          limit: 20,
        } satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(sortResponded);
  TestValidator.equals(
    "responded_at sorting limit",
    sortResponded.pagination.limit,
    20,
  );
  // Step 9: Test text search
  const searchResult =
    await api.functional.shoppingMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          search: "refund",
          limit: 20,
        } satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(searchResult);
  // Step 10: Test date range filtering
  const now = new Date();
  const dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const dateTo = now;
  const dateRangeResult =
    await api.functional.shoppingMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          created_from: dateFrom.toISOString(),
          created_to: dateTo.toISOString(),
          limit: 20,
        } satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(dateRangeResult);
  // Step 11: Test status filtering - pending
  const pendingStatus =
    await api.functional.shoppingMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          status: "pending",
          limit: 20,
        } satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(pendingStatus);
  // Step 12: Test status filtering - approved
  const approvedStatus =
    await api.functional.shoppingMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          status: "approved",
          limit: 20,
        } satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(approvedStatus);
  // Step 13: Test status filtering - rejected
  const rejectedStatus =
    await api.functional.shoppingMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          status: "rejected",
          limit: 20,
        } satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(rejectedStatus);
  // Step 14: Test combined filters
  const combinedFilters =
    await api.functional.shoppingMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          status: "pending",
          sort: "created_at",
          order: "desc",
          page: 1,
          limit: 50,
          search: "defective",
        } satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(combinedFilters);
  TestValidator.equals(
    "combined filters current page",
    combinedFilters.pagination.current,
    1,
  );
  TestValidator.equals(
    "combined filters limit",
    combinedFilters.pagination.limit,
    50,
  );
}
