import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequest";
import type { IDiscussionBoardAdminRequestDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequestDecision";
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

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_member_admin_requests_create } from "../../../generate/generate_random_discussion_board_member_admin_requests_create";
import { prepare_random_discussion_board_admin_request } from "../../../prepare/prepare_random_discussion_board_admin_request";

/**
 * Test that an administrator can filter administrator privilege escalation requests by status.
 * This test verifies:
 * 1. Filtering by status='pending' returns only requests awaiting super administrator review
 * 2. The reviewingAdministrator field is null for pending requests
 * 3. Pagination works correctly with filtered results
 * 4. Multiple requests can be filtered and validated independently
 */
export async function test_api_admin_request_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create multiple member accounts
  const memberConnections: api.IConnection[] = [];
  for (let i = 0; i < 3; i++) {
    const memberConnection: api.IConnection = { host: connection.host };
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "1234",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
    memberConnections.push(memberConnection);
  }
  // 3. Submit admin requests from each member
  const adminRequests: IDiscussionBoardAdminRequest[] = [];
  for (const memberConnection of memberConnections) {
    const request =
      await generate_random_discussion_board_member_admin_requests_create(
        memberConnection,
        {},
      );
    typia.assert(request);
    adminRequests.push(request);
  }
  // 4. Filter requests by status='pending'
  const pendingFilter = {
    status: "pending" as const,
    page: 1,
    limit: 100,
  } satisfies IDiscussionBoardAdminRequest.IRequest;
  const pendingResult =
    await api.functional.discussionBoard.administrator.admin_requests.index(
      adminConnection,
      { body: pendingFilter },
    );
  typia.assert(pendingResult);
  // 5. Verify all created requests are in pending status
  TestValidator.equals(
    "pending requests count matches created requests",
    pendingResult.data.length,
    adminRequests.length,
  );
  // 6. Verify all pending requests have null reviewingAdministrator
  for (const request of pendingResult.data) {
    TestValidator.equals(
      `reviewingAdministrator is null for pending request ${request.id}`,
      request.reviewingAdministrator,
      null,
    );
    TestValidator.equals(
      `status is pending for request ${request.id}`,
      request.status,
      "pending",
    );
  }
  // 7. Test pagination with filtered results
  const paginatedFilter = {
    status: "pending" as const,
    page: 1,
    limit: 2,
  } satisfies IDiscussionBoardAdminRequest.IRequest;
  const paginatedResult =
    await api.functional.discussionBoard.administrator.admin_requests.index(
      adminConnection,
      { body: paginatedFilter },
    );
  typia.assert(paginatedResult);
  TestValidator.equals(
    "pagination limit respected",
    paginatedResult.data.length,
    2,
  );
  TestValidator.equals(
    "pagination current page",
    paginatedResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit in metadata",
    paginatedResult.pagination.limit,
    2,
  );
  TestValidator.predicate(
    "pagination total records matches",
    paginatedResult.pagination.records === adminRequests.length,
  );
  // 8. Test filtering with no status filter (should return all)
  const allFilter = {
    page: 1,
    limit: 100,
  } satisfies IDiscussionBoardAdminRequest.IRequest;
  const allResult =
    await api.functional.discussionBoard.administrator.admin_requests.index(
      adminConnection,
      { body: allFilter },
    );
  typia.assert(allResult);
  TestValidator.equals(
    "all requests count matches created requests",
    allResult.data.length,
    adminRequests.length,
  );
}
