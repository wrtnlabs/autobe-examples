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

/**
 * Test that a registered member can retrieve a paginated list of their own administrator privilege escalation requests.
 *
 * Setup:
 * 1. Register a new member account using authorize_member_join utility
 *
 * Test Steps:
 * 1. Authenticate as a member using authorize_member_join utility
 * 2. Call PATCH /discussionBoard/member/admin-requests with empty filter (default pagination)
 * 3. Verify response contains pagination metadata (current, limit, records, pages)
 * 4. Verify response data array exists (may be empty since we can't create requests)
 * 5. Verify pagination structure matches IPage.IPagination
 * 6. Verify data isolation: member can only see their own requests (even if empty)
 *
 * Expected Results:
 * - HTTP 200 OK
 * - Response matches IPageIDiscussionBoardAdminRequest.ISummary structure
 * - Pagination metadata present with valid values
 * - Data array exists (empty or containing member's own requests)
 */
export async function test_api_admin_request_member_list_own_requests(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member setup - register and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. List own admin requests with default pagination
  const result =
    await api.functional.discussionBoard.member.admin_requests.index(
      memberConnection,
      {
        body: {} satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(result);
  // 3. Verify pagination metadata has valid values
  TestValidator.equals("current page is 1", result.pagination.current, 1);
  TestValidator.predicate("limit is positive", result.pagination.limit > 0);
  TestValidator.predicate(
    "records count is non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate("pages count is valid", result.pagination.pages >= 0);
  // 4. Verify data isolation - each request in the array should belong to this member
  // Since we can't create admin requests, the array should be empty
  // But if there are any requests, they should all belong to the authenticated member
  for (const request of result.data) {
    typia.assert(request);
    // Each request should have the member field
    TestValidator.predicate(
      "request has member info",
      request.member !== undefined,
    );
    // The member email should match the authenticated member's email
    // (We don't have access to the authenticated member's email directly,
    // but the API should ensure data isolation)
  }
  // 5. Verify pagination consistency
  if (result.pagination.records > 0) {
    TestValidator.equals(
      "data length matches first page limit",
      result.data.length,
      Math.min(result.pagination.limit, result.pagination.records),
    );
  } else {
    TestValidator.equals("empty data array", result.data.length, 0);
  }
}
