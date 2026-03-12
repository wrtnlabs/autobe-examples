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
 * Test that a super administrator can successfully retrieve a paginated list of pending administrator privilege escalation requests.
 *
 * Setup:
 * 1. Create a super administrator account and authenticate
 * 2. Create 2 member accounts and authenticate each
 * 3. Each member submits an administrator privilege request
 *
 * Test:
 * 1. Super administrator retrieves the pending admin requests list
 * 2. Validate response structure, pagination, and request details
 */
export async function test_api_admin_request_pending_list_view_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminJoin = {
    email: "superadmin@test.com",
    password: "password123",
    display_name: "Super Admin",
    href: "https://example.com/admin",
    referrer: "https://example.com",
  } satisfies IDiscussionBoardAdministrator.IJoin;
  await authorize_administrator_join(superAdminConnection, {
    body: superAdminJoin,
  });
  // 2. Create first member account and submit admin request
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Join = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password123",
    display_name: "Member One",
    href: "https://example.com/member",
    referrer: "https://example.com",
  } satisfies IDiscussionBoardMember.IJoin;
  await authorize_member_join(member1Connection, { body: member1Join });
  const request1 =
    await generate_random_discussion_board_member_admin_requests_create(
      member1Connection,
      {
        body: {
          reason:
            "I want to become an administrator to help moderate discussions.",
        },
      },
    );
  typia.assert(request1);
  // 3. Create second member account and submit admin request
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Join = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password123",
    display_name: "Member Two",
    href: "https://example.com/member",
    referrer: "https://example.com",
  } satisfies IDiscussionBoardMember.IJoin;
  await authorize_member_join(member2Connection, { body: member2Join });
  const request2 =
    await generate_random_discussion_board_member_admin_requests_create(
      member2Connection,
      {
        body: {
          reason: "I have experience in community management and want to help.",
        },
      },
    );
  typia.assert(request2);
  // 4. Super administrator retrieves pending admin requests list
  const pendingRequests =
    await api.functional.discussionBoard.administrator.admin_requests.pending.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(pendingRequests);
  // 5. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    pendingRequests.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    pendingRequests.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination has records",
    pendingRequests.pagination.records >= 2,
  );
  TestValidator.predicate(
    "pagination has pages",
    pendingRequests.pagination.pages >= 1,
  );
  // 6. Validate request list contains at least 2 requests
  TestValidator.predicate(
    "has at least 2 pending requests",
    pendingRequests.data.length >= 2,
  );
  // 7. Validate each request has correct structure and status
  for (const request of pendingRequests.data) {
    // Validate status is pending
    TestValidator.equals(
      "request status is pending",
      request.status,
      "pending",
    );
    // Validate reviewed_at is null for pending requests
    TestValidator.equals(
      "reviewed_at is null for pending request",
      request.reviewed_at,
      null,
    );
    // Validate member information exists
    TestValidator.predicate(
      "member id exists",
      request.member.id !== undefined,
    );
    TestValidator.predicate(
      "member email exists",
      request.member.email !== undefined,
    );
    TestValidator.predicate(
      "member display_name exists",
      request.member.display_name !== null,
    );
    TestValidator.predicate(
      "member banned exists",
      request.member.banned !== undefined,
    );
    TestValidator.predicate(
      "member created_at exists",
      request.member.created_at !== undefined,
    );
    // Validate reason exists
    TestValidator.predicate(
      "request reason exists",
      request.reason !== undefined && request.reason.length > 0,
    );
    // Validate submitted_at exists
    TestValidator.predicate(
      "submitted_at exists",
      request.submitted_at !== undefined,
    );
  }
  // 8. Validate requests are sorted by submitted_at in descending order
  if (pendingRequests.data.length >= 2) {
    const firstRequest = pendingRequests.data[0];
    const secondRequest = pendingRequests.data[1];
    TestValidator.predicate(
      "requests sorted by submitted_at descending",
      new Date(firstRequest.submitted_at).getTime() >=
        new Date(secondRequest.submitted_at).getTime(),
    );
  }
}
