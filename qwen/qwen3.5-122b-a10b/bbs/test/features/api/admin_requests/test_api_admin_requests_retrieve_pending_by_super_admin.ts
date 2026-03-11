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
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_member_admin_requests_create } from "../../../generate/generate_random_discussion_board_member_admin_requests_create";
import { prepare_random_discussion_board_admin_request } from "../../../prepare/prepare_random_discussion_board_admin_request";

/**
 * Test super administrator retrieves pending admin requests.
 * 1. Create super administrator account
 * 2. Create multiple member accounts
 * 3. Members submit admin privilege requests
 * 4. Super admin retrieves pending requests with filtering
 * 5. Validate results include member summaries, correct status, and null reviewers
 */
export async function test_api_admin_requests_retrieve_pending_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      grade: "super",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 2. Create first member and submit request
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member1);
  const request1 =
    await generate_random_discussion_board_member_admin_requests_create(
      member1Connection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardAdminRequest.ICreate,
      },
    );
  typia.assert(request1);
  // 3. Create second member and submit request
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member2);
  const request2 =
    await generate_random_discussion_board_member_admin_requests_create(
      member2Connection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardAdminRequest.ICreate,
      },
    );
  typia.assert(request2);
  // 4. Retrieve pending requests as super admin
  const pendingRequests =
    await api.functional.discussionBoard.admin.admin_requests.index(
      adminConnection,
      {
        body: {
          status: "pending",
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(pendingRequests);
  // 5. Validate results
  TestValidator.equals(
    "total pending requests",
    pendingRequests.pagination.records,
    2,
  );
  TestValidator.equals("data array length", pendingRequests.data.length, 2);
  // Validate each request has correct structure
  for (const req of pendingRequests.data) {
    TestValidator.equals("status is pending", req.status, "pending");
    TestValidator.predicate("reason is not empty", req.reason.length > 0);
    TestValidator.predicate(
      "has member summary",
      req.member !== null && req.member !== undefined,
    );
    TestValidator.equals("reviewer is null for pending", req.reviewer, null);
    TestValidator.predicate(
      "has submitted_at timestamp",
      req.submitted_at !== null && req.submitted_at !== undefined,
    );
  }
  // Validate sorting (newest first)
  const submittedAts = pendingRequests.data.map((r) =>
    new Date(r.submitted_at).getTime(),
  );
  for (let i = 1; i < submittedAts.length; i++) {
    TestValidator.predicate(
      `sorted descending at index ${i}`,
      submittedAts[i - 1] >= submittedAts[i],
    );
  }
  // Validate member information is included
  const memberIds = pendingRequests.data.map((r) => r.member.id);
  TestValidator.equals(
    "member1 request included",
    memberIds.includes(request1.member.id),
    true,
  );
  TestValidator.equals(
    "member2 request included",
    memberIds.includes(request2.member.id),
    true,
  );
}
