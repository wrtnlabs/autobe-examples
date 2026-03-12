import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequest";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdminRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_admin_request_member_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test that a member can filter their administrator requests by status (pending, approved, rejected).
   *
   * Setup:
   * 1. Register a new member account
   *
   * Test Steps:
   * 1. Authenticate as the member using authorize_member_join utility
   * 2. Call PATCH /discussionBoard/member/admin-requests with status='pending'
   * 3. Verify only pending requests are returned (or empty if none exist)
   * 4. Call with status='approved'
   * 5. Verify only approved requests are returned
   * 6. Call with status='rejected'
   * 7. Verify only rejected requests are returned
   * 8. Verify each filtered result contains proper pagination metadata
   *
   * Expected Results:
   * - HTTP 200 OK for all status filters
   * - Status filter correctly limits results to matching status
   * - Pagination metadata reflects filtered record count
   * - Data isolation maintained: only member's own requests returned
   */
  // 1. Member setup - register and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // Store member ID for data isolation validation
  const memberId = memberAuth.id;
  // 2. Test filtering by status='pending'
  const pendingFilter = {
    status: "pending" as const,
  } satisfies IDiscussionBoardAdminRequest.IRequest;
  const pendingResult =
    await api.functional.discussionBoard.member.admin_requests.index(
      memberConnection,
      { body: pendingFilter },
    );
  typia.assert(pendingResult);
  // Validate pending filter response structure
  TestValidator.equals(
    "pending filter - pagination current page",
    pendingResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pending filter - all items have status 'pending'",
    () => pendingResult.data.every((item) => item.status === "pending"),
  );
  // 3. Test filtering by status='approved'
  const approvedFilter = {
    status: "approved" as const,
  } satisfies IDiscussionBoardAdminRequest.IRequest;
  const approvedResult =
    await api.functional.discussionBoard.member.admin_requests.index(
      memberConnection,
      { body: approvedFilter },
    );
  typia.assert(approvedResult);
  // Validate approved filter response structure
  TestValidator.equals(
    "approved filter - pagination current page",
    approvedResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "approved filter - all items have status 'approved'",
    () => approvedResult.data.every((item) => item.status === "approved"),
  );
  // 4. Test filtering by status='rejected'
  const rejectedFilter = {
    status: "rejected" as const,
  } satisfies IDiscussionBoardAdminRequest.IRequest;
  const rejectedResult =
    await api.functional.discussionBoard.member.admin_requests.index(
      memberConnection,
      { body: rejectedFilter },
    );
  typia.assert(rejectedResult);
  // Validate rejected filter response structure
  TestValidator.equals(
    "rejected filter - pagination current page",
    rejectedResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "rejected filter - all items have status 'rejected'",
    () => rejectedResult.data.every((item) => item.status === "rejected"),
  );
  // 5. Verify pagination metadata consistency across all filters
  TestValidator.predicate(
    "pending filter - pagination has valid limit",
    () => pendingResult.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "approved filter - pagination has valid limit",
    () => approvedResult.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "rejected filter - pagination has valid limit",
    () => rejectedResult.pagination.limit >= 1,
  );
  // 6. Verify data isolation - all returned requests belong to the authenticated member
  TestValidator.predicate("pending filter - data isolation maintained", () =>
    pendingResult.data.every((item) => item.member.id === memberId),
  );
  TestValidator.predicate("approved filter - data isolation maintained", () =>
    approvedResult.data.every((item) => item.member.id === memberId),
  );
  TestValidator.predicate("rejected filter - data isolation maintained", () =>
    rejectedResult.data.every((item) => item.member.id === memberId),
  );
}
