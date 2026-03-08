import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequest";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdminRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test super administrator filtering administrator privilege requests by status and date ranges.
 *
 * This test validates:
 * 1. Status filtering (pending, approved, rejected)
 * 2. Date range filtering (submitted_at and reviewed_at)
 * 3. Combined filtering with multiple criteria
 * 4. Pagination metadata accuracy with filters
 * 5. Null handling for reviewed_at on pending requests
 * 6. Empty results handling
 */
export async function test_api_admin_request_list_filtering_by_status_and_date(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(superAdmin);
  TestValidator.equals("super admin grade", superAdmin.grade, "super");
  // 2. Create regular admin for request submission
  const regularAdminConnection: api.IConnection = { host: connection.host };
  const regularAdmin = await authorize_admin_join(regularAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(regularAdmin);
  // 3. Create test requests with different statuses and dates
  // Note: In simulation mode, requests will be created with random data
  // For real testing, we would need to create requests through appropriate endpoints
  // and then filter them. Since we're testing the index endpoint, we'll use typia.random
  // to generate valid request filters and validate the response structure.
  // Test 1: Filter by status = pending
  const pendingRequests =
    await api.functional.discussionBoard.admin.admin.requests.index(
      superAdminConnection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(pendingRequests);
  TestValidator.predicate(
    "pending filter returns paginated response",
    pendingRequests.data !== undefined,
  );
  // Verify all returned requests have status 'pending'
  for (const request of pendingRequests.data) {
    TestValidator.equals("status is pending", request.status, "pending");
    // Pending requests should have null reviewed_at
    TestValidator.equals(
      "pending request reviewed_at is null",
      request.reviewed_at,
      null,
    );
  }
  // Test 2: Filter by status = approved
  const approvedRequests =
    await api.functional.discussionBoard.admin.admin.requests.index(
      superAdminConnection,
      {
        body: {
          status: "approved",
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(approvedRequests);
  TestValidator.predicate(
    "approved filter returns paginated response",
    approvedRequests.data !== undefined,
  );
  // Verify all returned requests have status 'approved'
  for (const request of approvedRequests.data) {
    TestValidator.equals("status is approved", request.status, "approved");
    // Approved requests should have non-null reviewed_at
    TestValidator.predicate(
      "approved request has reviewed_at",
      request.reviewed_at !== null,
    );
  }
  // Test 3: Filter by status = rejected
  const rejectedRequests =
    await api.functional.discussionBoard.admin.admin.requests.index(
      superAdminConnection,
      {
        body: {
          status: "rejected",
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(rejectedRequests);
  TestValidator.predicate(
    "rejected filter returns paginated response",
    rejectedRequests.data !== undefined,
  );
  // Verify all returned requests have status 'rejected'
  for (const request of rejectedRequests.data) {
    TestValidator.equals("status is rejected", request.status, "rejected");
    // Rejected requests should have non-null reviewed_at
    TestValidator.predicate(
      "rejected request has reviewed_at",
      request.reviewed_at !== null,
    );
  }
  // Test 4: Filter by submitted_at date range
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const dateFilteredRequests =
    await api.functional.discussionBoard.admin.admin.requests.index(
      superAdminConnection,
      {
        body: {
          submitted_at_from: oneWeekAgo.toISOString(),
          submitted_at_to: now.toISOString(),
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(dateFilteredRequests);
  TestValidator.predicate(
    "date filter returns paginated response",
    dateFilteredRequests.data !== undefined,
  );
  // Verify all returned requests are within the date range
  for (const request of dateFilteredRequests.data) {
    const requestDate = new Date(request.submitted_at);
    TestValidator.predicate(
      "submitted_at >= submitted_at_from",
      requestDate >= oneWeekAgo,
    );
    TestValidator.predicate(
      "submitted_at <= submitted_at_to",
      requestDate <= now,
    );
  }
  // Test 5: Combined filtering (status + date range)
  const combinedFilteredRequests =
    await api.functional.discussionBoard.admin.admin.requests.index(
      superAdminConnection,
      {
        body: {
          status: "pending",
          submitted_at_from: oneWeekAgo.toISOString(),
          submitted_at_to: now.toISOString(),
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(combinedFilteredRequests);
  TestValidator.predicate(
    "combined filter returns paginated response",
    combinedFilteredRequests.data !== undefined,
  );
  // Verify all returned requests match both criteria
  for (const request of combinedFilteredRequests.data) {
    TestValidator.equals("status matches filter", request.status, "pending");
    const requestDate = new Date(request.submitted_at);
    TestValidator.predicate(
      "submitted_at within range",
      requestDate >= oneWeekAgo && requestDate <= now,
    );
  }
  // Test 6: Pagination metadata validation
  TestValidator.equals(
    "pagination current is 1",
    combinedFilteredRequests.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    combinedFilteredRequests.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    combinedFilteredRequests.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    combinedFilteredRequests.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data length matches records or limit",
    combinedFilteredRequests.data.length <=
      combinedFilteredRequests.pagination.limit,
  );
  // Test 7: Empty results with non-matching filter
  // Use a date range that likely has no data (very far in the future)
  const futureDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
  const emptyResult =
    await api.functional.discussionBoard.admin.admin.requests.index(
      superAdminConnection,
      {
        body: {
          submitted_at_from: futureDate.toISOString(),
          submitted_at_to: new Date(
            futureDate.getTime() + 86400000,
          ).toISOString(),
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals("empty result has no data", emptyResult.data.length, 0);
  TestValidator.equals(
    "empty result records is 0",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result pages is 0",
    emptyResult.pagination.pages,
    0,
  );
  // Test 8: Filter by reviewed_at date range (for approved/rejected requests)
  const reviewedAtFilteredRequests =
    await api.functional.discussionBoard.admin.admin.requests.index(
      superAdminConnection,
      {
        body: {
          reviewed_at_from: null,
          reviewed_at_to: now.toISOString(),
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(reviewedAtFilteredRequests);
  TestValidator.predicate(
    "reviewed_at filter returns paginated response",
    reviewedAtFilteredRequests.data !== undefined,
  );
  // Verify all returned requests have reviewed_at within range (or null if filter allows)
  for (const request of reviewedAtFilteredRequests.data) {
    if (request.reviewed_at !== null) {
      const reviewedDate = new Date(request.reviewed_at);
      TestValidator.predicate(
        "reviewed_at <= reviewed_at_to",
        reviewedDate <= now,
      );
    }
  }
}
