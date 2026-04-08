import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test successful retrieval of filtered cancellation requests by admin.
 * - Authenticates as admin
 * - Tests various filter combinations and pagination
 * - Validates response structure and data integrity
 */
export async function test_api_admin_cancellation_request_search_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Test search without filters (retrieve all cancellation requests)
  const allRequests =
    await api.functional.ecommerceMall.admin.cancellation_requests.index(
      adminConnection,
      {
        body: {},
      },
    );
  typia.assert(allRequests);
  // 3. Test search with status filter - pending
  const pendingRequests =
    await api.functional.ecommerceMall.admin.cancellation_requests.index(
      adminConnection,
      {
        body: {
          status: "pending",
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(pendingRequests);
  // 4. Test search with status filter - approved
  const approvedRequests =
    await api.functional.ecommerceMall.admin.cancellation_requests.index(
      adminConnection,
      {
        body: {
          status: "approved",
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(approvedRequests);
  // 5. Test search with status filter - rejected
  const rejectedRequests =
    await api.functional.ecommerceMall.admin.cancellation_requests.index(
      adminConnection,
      {
        body: {
          status: "rejected",
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(rejectedRequests);
  // 6. Test search with pagination parameters
  const limitValue = 10;
  const paginatedRequests =
    await api.functional.ecommerceMall.admin.cancellation_requests.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: limitValue,
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(paginatedRequests);
  // Validate pagination respects input parameters (business logic, not type validation)
  TestValidator.equals(
    "pagination current page matches request",
    paginatedRequests.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    paginatedRequests.pagination.limit,
    limitValue,
  );
  // Data length should not exceed the requested limit
  TestValidator.predicate(
    "data length respects limit",
    paginatedRequests.data.length <= limitValue,
  );
  // 7. Test search with sorting options
  const sortedRequests =
    await api.functional.ecommerceMall.admin.cancellation_requests.index(
      adminConnection,
      {
        body: {
          sortBy: "createdAt",
          sortOrder: "desc",
          limit: 5,
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(sortedRequests);
  // 8. Test search with combined filters
  const combinedFilters =
    await api.functional.ecommerceMall.admin.cancellation_requests.index(
      adminConnection,
      {
        body: {
          status: "pending",
          sortBy: "status",
          sortOrder: "asc",
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(combinedFilters);
  // 9. Test search with date range filters
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const dateFilteredRequests =
    await api.functional.ecommerceMall.admin.cancellation_requests.index(
      adminConnection,
      {
        body: {
          createdAtFrom: yesterday.toISOString(),
          createdAtTo: now.toISOString(),
          limit: 50,
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(dateFilteredRequests);
  // 10. Test search with search keyword
  const searchRequests =
    await api.functional.ecommerceMall.admin.cancellation_requests.index(
      adminConnection,
      {
        body: {
          search: "test",
          limit: 15,
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(searchRequests);
}
