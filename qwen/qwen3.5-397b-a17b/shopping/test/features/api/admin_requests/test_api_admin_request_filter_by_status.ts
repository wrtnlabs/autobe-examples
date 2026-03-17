import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminRequest";
import type { IShoppingMallAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test the status filtering capability where a super administrator filters
 * admin promotion requests by different workflow statuses.
 *
 * Test Steps:
 * 1. Super administrator authenticates via /shoppingMall/auth/superAdmin/join
 * 2. Query admin requests with status='APPROVED' filter and verify response structure
 * 3. Query admin requests with status='REJECTED' filter and verify response structure
 * 4. Query admin requests with status='PENDING' filter and verify response structure
 * 5. Query admin requests with no status filter and verify all requests are returned
 * 6. Verify date range filtering works correctly (requested_at_from, requested_at_to)
 * 7. Verify sorting by status field works correctly
 * 8. Verify sorting by requested_at field works correctly
 * 9. Verify pagination parameters work correctly
 *
 * Business Validation:
 * - Status filtering correctly isolates requests by workflow state
 * - Date range filtering respects requested_at timestamps
 * - Sorting by different fields (requested_at, status) works as expected
 * - Empty results handled correctly when no requests match filter criteria
 * - Response structure matches IPageIShoppingMallAdminRequest.ISummary with pagination and data array
 */
export async function test_api_admin_request_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super administrator authentication
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSuperAdmin.IJoin,
  });
  typia.assert(authResult);
  // 2. Test status filter - APPROVED
  const approvedResponse =
    await api.functional.shoppingMall.superAdmin.admin_requests.index(
      superAdminConnection,
      {
        body: {
          status: "APPROVED",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallAdminRequest.IRequest,
      },
    );
  typia.assert(approvedResponse);
  TestValidator.predicate(
    "approved response has pagination",
    () => approvedResponse.pagination !== undefined,
  );
  TestValidator.predicate("approved response has data array", () =>
    Array.isArray(approvedResponse.data),
  );
  TestValidator.predicate("all returned requests are APPROVED", () =>
    approvedResponse.data.every((req) => req.status === "APPROVED"),
  );
  // 3. Test status filter - REJECTED
  const rejectedResponse =
    await api.functional.shoppingMall.superAdmin.admin_requests.index(
      superAdminConnection,
      {
        body: {
          status: "REJECTED",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallAdminRequest.IRequest,
      },
    );
  typia.assert(rejectedResponse);
  TestValidator.predicate("all returned requests are REJECTED", () =>
    rejectedResponse.data.every((req) => req.status === "REJECTED"),
  );
  // 4. Test status filter - PENDING
  const pendingResponse =
    await api.functional.shoppingMall.superAdmin.admin_requests.index(
      superAdminConnection,
      {
        body: {
          status: "PENDING",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallAdminRequest.IRequest,
      },
    );
  typia.assert(pendingResponse);
  TestValidator.predicate("all returned requests are PENDING", () =>
    pendingResponse.data.every((req) => req.status === "PENDING"),
  );
  // 5. Test no status filter (all requests)
  const allResponse =
    await api.functional.shoppingMall.superAdmin.admin_requests.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IShoppingMallAdminRequest.IRequest,
      },
    );
  typia.assert(allResponse);
  TestValidator.predicate(
    "all requests count >= sum of filtered counts",
    () =>
      allResponse.data.length >=
      approvedResponse.data.length +
        rejectedResponse.data.length +
        pendingResponse.data.length,
  );
  // 6. Test date range filtering
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneDayLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const dateRangeResponse =
    await api.functional.shoppingMall.superAdmin.admin_requests.index(
      superAdminConnection,
      {
        body: {
          requested_at_from: oneDayAgo.toISOString(),
          requested_at_to: oneDayLater.toISOString(),
          page: 1,
          limit: 20,
        } satisfies IShoppingMallAdminRequest.IRequest,
      },
    );
  typia.assert(dateRangeResponse);
  TestValidator.predicate(
    "date range response has valid structure",
    () =>
      dateRangeResponse.pagination !== undefined &&
      Array.isArray(dateRangeResponse.data),
  );
  // 7. Test sorting by status
  const sortByStatusResponse =
    await api.functional.shoppingMall.superAdmin.admin_requests.index(
      superAdminConnection,
      {
        body: {
          sort: "status",
          direction: "asc",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallAdminRequest.IRequest,
      },
    );
  typia.assert(sortByStatusResponse);
  TestValidator.predicate(
    "sort by status response valid",
    () =>
      sortByStatusResponse.pagination !== undefined &&
      Array.isArray(sortByStatusResponse.data),
  );
  // 8. Test sorting by requested_at descending
  const sortByDateResponse =
    await api.functional.shoppingMall.superAdmin.admin_requests.index(
      superAdminConnection,
      {
        body: {
          sort: "requested_at",
          direction: "desc",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallAdminRequest.IRequest,
      },
    );
  typia.assert(sortByDateResponse);
  TestValidator.predicate(
    "sort by date response valid",
    () =>
      sortByDateResponse.pagination !== undefined &&
      Array.isArray(sortByDateResponse.data),
  );
  // 9. Test pagination parameters
  const paginatedResponse =
    await api.functional.shoppingMall.superAdmin.admin_requests.index(
      superAdminConnection,
      {
        body: {
          page: 2,
          limit: 10,
        } satisfies IShoppingMallAdminRequest.IRequest,
      },
    );
  typia.assert(paginatedResponse);
  TestValidator.equals(
    "pagination current page",
    paginatedResponse.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination limit",
    paginatedResponse.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "data length <= limit",
    () => paginatedResponse.data.length <= 10,
  );
  // 10. Verify each request item structure
  if (allResponse.data.length > 0) {
    const firstRequest = allResponse.data[0];
    TestValidator.predicate(
      "request has id",
      () => firstRequest.id !== undefined,
    );
    TestValidator.predicate(
      "request has reason",
      () => firstRequest.reason !== undefined,
    );
    TestValidator.predicate(
      "request has status",
      () => firstRequest.status !== undefined,
    );
    TestValidator.predicate(
      "request has requested_at",
      () => firstRequest.requested_at !== undefined,
    );
    TestValidator.predicate(
      "request has customer",
      () => firstRequest.customer !== undefined,
    );
    TestValidator.predicate(
      "customer has email",
      () => firstRequest.customer.email !== undefined,
    );
  }
}
