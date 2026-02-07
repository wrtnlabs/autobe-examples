import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test the search functionality for pending promotion requests.
 * A super administrator authenticates and searches for promotion requests with 'pending' status
 * to review new requests. The test verifies that only pending requests are returned,
 * that pagination works correctly, and that the response includes all required summary
 * information including user details and timestamps.
 */
export async function test_api_admin_promotion_request_search_pending_requests(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Note: The promotion request creation endpoint is not available in the provided API functions.
  // Since we cannot create test promotion requests, we'll test the search functionality
  // with whatever existing data is in the system, focusing on validating the response structure
  // and filtering logic.
  // Search for pending promotion requests
  const searchResult =
    await api.functional.discussionBoard.admin.promotion_requests.index(
      adminConnection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdministratorPromotionRequest.IRequest,
      },
    );
  typia.assert(searchResult);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    searchResult.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", searchResult.pagination.limit, 10);
  TestValidator.predicate(
    "records count is non-negative",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    searchResult.pagination.pages >= 0,
  );
  // Validate pagination calculations
  if (searchResult.pagination.records > 0) {
    TestValidator.predicate(
      "pages calculation is correct",
      searchResult.pagination.pages ===
        Math.ceil(
          searchResult.pagination.records / searchResult.pagination.limit,
        ),
    );
  }
  // Validate that all returned requests are pending
  for (const request of searchResult.data) {
    TestValidator.equals(
      "request status should be pending",
      request.status,
      "pending",
    );
    // Validate request structure
    TestValidator.predicate(
      "request has valid UUID ID",
      /^[0-9a-f-]{36}$/i.test(request.id),
    );
    TestValidator.predicate(
      "request has reason text",
      request.reason.length > 0,
    );
    TestValidator.predicate(
      "request has user information",
      request.user.id.length > 0,
    );
    TestValidator.predicate(
      "request has user display name",
      request.user.display_name.length > 0,
    );
    TestValidator.predicate(
      "request has valid creation timestamp",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(request.created_at),
    );
    TestValidator.predicate(
      "request has valid update timestamp",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(request.updated_at),
    );
    // Pending requests should not have reviewer, approved_at, or rejected_at
    TestValidator.equals(
      "pending request reviewer should be null",
      request.reviewer,
      null,
    );
    TestValidator.equals(
      "pending request approved_at should be null",
      request.approved_at,
      null,
    );
    TestValidator.equals(
      "pending request rejected_at should be null",
      request.rejected_at,
      null,
    );
  }
  // Test that non-pending requests are filtered out by searching with different statuses
  const approvedSearch =
    await api.functional.discussionBoard.admin.promotion_requests.index(
      adminConnection,
      {
        body: {
          status: "approved",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdministratorPromotionRequest.IRequest,
      },
    );
  typia.assert(approvedSearch);
  const rejectedSearch =
    await api.functional.discussionBoard.admin.promotion_requests.index(
      adminConnection,
      {
        body: {
          status: "rejected",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdministratorPromotionRequest.IRequest,
      },
    );
  typia.assert(rejectedSearch);
  // Verify that different status searches return different results (if any exist)
  if (searchResult.data.length > 0 && approvedSearch.data.length > 0) {
    TestValidator.notEquals(
      "pending and approved requests should have different IDs",
      searchResult.data[0].id,
      approvedSearch.data[0].id,
    );
  }
  if (searchResult.data.length > 0 && rejectedSearch.data.length > 0) {
    TestValidator.notEquals(
      "pending and rejected requests should have different IDs",
      searchResult.data[0].id,
      rejectedSearch.data[0].id,
    );
  }
}
