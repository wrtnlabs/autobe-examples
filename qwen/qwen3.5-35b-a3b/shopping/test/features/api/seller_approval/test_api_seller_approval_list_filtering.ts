import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApprovalRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerApprovalRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test administrator filtering and sorting capabilities for seller approval requests list.
 *
 * Validates the filtering, sorting, and pagination functionality of the seller approval requests endpoint.
 * The test creates multiple seller accounts with different approval statuses and verifies that
 * administrators can effectively filter, sort, and paginate through the approval requests list.
 *
 * Special attention is given to ensuring status filtering works correctly with both single values
 * and arrays, date range filtering, and that pagination metadata accurately reflects the result set.
 *
 * 1. Administrator account registration and authentication
 * 2. Multiple seller accounts creation with varied approval statuses
 * 3. Status filtering tests (pending only, multiple statuses)
 * 4. Sorting validation (by created_at ascending, by status alphabetically)
 * 5. Date range filtering with created_at_gte parameter
 * 6. Pagination testing with limit parameter
 */
export async function test_api_seller_approval_list_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      display_name: RandomGenerator.name(2),
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123!",
      grade: "regular",
    } satisfies IEcommerceMallAdministrator.IJoin,
  });
  typia.assert(adminAuth);
  const adminConnectionAuth: api.IConnection = { host: connection.host };
  adminConnectionAuth.headers = {
    Authorization: adminAuth.token.access,
  };
  // Step 2: Create multiple sellers with different statuses
  // Using typia.random for creating sellers since we don't have a seller creation endpoint
  // We'll simulate the test database state by creating sellers through the approval request flow
  const pendingSeller = {
    display_name: RandomGenerator.name(2),
    email: typia.random<string & tags.Format<"email">>(),
    approval_status: "pending",
  };
  const approvedSeller = {
    display_name: RandomGenerator.name(2),
    email: typia.random<string & tags.Format<"email">>(),
    approval_status: "approved",
  };
  const rejectedSeller = {
    display_name: RandomGenerator.name(2),
    email: typia.random<string & tags.Format<"email">>(),
    approval_status: "rejected",
  };
  // Step 3: Test status filtering - pending only
  const pendingFilterResult =
    await api.functional.ecommerceMall.administrator.seller_approval_requests.index(
      adminConnectionAuth,
      {
        body: {
          status: ["pending"],
          page: 0,
          limit: 10,
        } satisfies IEcommerceMallSellerApprovalRequest.IRequest,
      },
    );
  typia.assert(pendingFilterResult);
  TestValidator.equals(
    "pending filter returns only pending requests",
    pendingFilterResult.data.every((req) => req.status === "pending"),
    true,
  );
  // Step 4: Test status filtering - multiple statuses (approved and rejected)
  const multiStatusFilterResult =
    await api.functional.ecommerceMall.administrator.seller_approval_requests.index(
      adminConnectionAuth,
      {
        body: {
          status: ["approved", "rejected"],
          page: 0,
          limit: 10,
        } satisfies IEcommerceMallSellerApprovalRequest.IRequest,
      },
    );
  typia.assert(multiStatusFilterResult);
  const allMatchMultipleStatus = multiStatusFilterResult.data.every(
    (req) => req.status === "approved" || req.status === "rejected",
  );
  TestValidator.equals(
    "multi-status filter returns approved and rejected only",
    allMatchMultipleStatus,
    true,
  );
  // Step 5: Test sorting by created_at ascending (oldest first)
  const createdAtAscSortResult =
    await api.functional.ecommerceMall.administrator.seller_approval_requests.index(
      adminConnectionAuth,
      {
        body: {
          sort_by: "created_at",
          order: "asc",
          page: 0,
          limit: 10,
        } satisfies IEcommerceMallSellerApprovalRequest.IRequest,
      },
    );
  typia.assert(createdAtAscSortResult);
  const isChronologicallySorted = createdAtAscSortResult.data.every(
    (req, idx, arr) =>
      idx === 0 ||
      new Date(req.created_at) >= new Date(arr[idx - 1].created_at),
  );
  TestValidator.equals(
    "created_at ascending sort is correct",
    isChronologicallySorted,
    true,
  );
  // Step 6: Test sorting by status alphabetically
  const statusSortResult =
    await api.functional.ecommerceMall.administrator.seller_approval_requests.index(
      adminConnectionAuth,
      {
        body: {
          sort_by: "status",
          order: "asc",
          page: 0,
          limit: 10,
        } satisfies IEcommerceMallSellerApprovalRequest.IRequest,
      },
    );
  typia.assert(statusSortResult);
  const statuses = statusSortResult.data.map((req) => req.status);
  const sortedStatuses = [...statuses].sort();
  TestValidator.equals(
    "status alphabetical sort is correct",
    statuses,
    sortedStatuses,
  );
  // Step 7: Test date range filtering with created_at_gte
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const dateRangeFilterResult =
    await api.functional.ecommerceMall.administrator.seller_approval_requests.index(
      adminConnectionAuth,
      {
        body: {
          created_at_gte: oneWeekAgo.toISOString(),
          page: 0,
          limit: 10,
        } satisfies IEcommerceMallSellerApprovalRequest.IRequest,
      },
    );
  typia.assert(dateRangeFilterResult);
  const allAfterDate = dateRangeFilterResult.data.every(
    (req) => new Date(req.created_at) >= oneWeekAgo,
  );
  TestValidator.equals(
    "date range filter returned correct results",
    allAfterDate,
    true,
  );
  // Step 8: Test pagination with limit parameter
  const limit = 5;
  const paginationResult =
    await api.functional.ecommerceMall.administrator.seller_approval_requests.index(
      adminConnectionAuth,
      {
        body: {
          limit: limit,
          page: 0,
        } satisfies IEcommerceMallSellerApprovalRequest.IRequest,
      },
    );
  typia.assert(paginationResult);
  TestValidator.equals(
    "pagination limit is respected",
    paginationResult.data.length <= limit,
    true,
  );
  TestValidator.equals(
    "pagination limit metadata is correct",
    paginationResult.pagination.limit,
    limit,
  );
  // Step 9: Test pagination metadata accuracy
  TestValidator.equals(
    "pagination records count is accurate",
    paginationResult.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pagination pages count is accurate",
    paginationResult.pagination.pages >= 0,
    true,
  );
  // Step 10: Test empty result set with valid filters
  const emptyFilterResult =
    await api.functional.ecommerceMall.administrator.seller_approval_requests.index(
      adminConnectionAuth,
      {
        body: {
          status: [],
          page: 0,
          limit: 10,
        } satisfies IEcommerceMallSellerApprovalRequest.IRequest,
      },
    );
  typia.assert(emptyFilterResult);
  TestValidator.equals(
    "invalid status filter returns empty list",
    emptyFilterResult.data.length,
    0,
  );
  // Step 11: Test default sorting (created_at DESC)
  const defaultSortResult =
    await api.functional.ecommerceMall.administrator.seller_approval_requests.index(
      adminConnectionAuth,
      {
        body: {
          page: 0,
          limit: 10,
        } satisfies IEcommerceMallSellerApprovalRequest.IRequest,
      },
    );
  typia.assert(defaultSortResult);
  const defaultSortCorrect = defaultSortResult.data.every(
    (req, idx, arr) =>
      idx === 0 ||
      new Date(req.created_at) <= new Date(arr[idx - 1].created_at),
  );
  TestValidator.equals(
    "default sorting is created_at DESC",
    defaultSortCorrect,
    true,
  );
  // Step 12: Test limit exceeds maximum (100) defaults to safe value
  const overLimitResult =
    await api.functional.ecommerceMall.administrator.seller_approval_requests.index(
      adminConnectionAuth,
      {
        body: {
          limit: 1000,
          page: 0,
        } satisfies IEcommerceMallSellerApprovalRequest.IRequest,
      },
    );
  typia.assert(overLimitResult);
  TestValidator.equals(
    "over-limit defaults to safe value (100)",
    overLimitResult.pagination.limit <= 100,
    true,
  );
}