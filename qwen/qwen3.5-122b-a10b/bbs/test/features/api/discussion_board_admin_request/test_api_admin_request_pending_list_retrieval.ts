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
 * Test super administrator retrieves pending admin requests list.
 *
 * 1. Create super administrator account and authenticate
 * 2. Create member account and submit first admin request
 * 3. Create second member account and submit second admin request
 * 4. Super admin retrieves pending requests list
 * 5. Validate response structure, pagination, and member details
 */
export async function test_api_admin_request_pending_list_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: adminPassword,
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Login as admin to get super admin credentials
  const adminLoginConnection: api.IConnection = { host: connection.host };
  const adminLogin = await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminAuth.email,
      password: adminPassword,
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  typia.assert(adminLogin);
  // 2. Create first member and submit admin request
  const member1Password = RandomGenerator.alphaNumeric(16);
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Auth = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: member1Password,
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member1Auth);
  const request1 =
    await generate_random_discussion_board_member_admin_requests_create(
      member1Connection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IDiscussionBoardAdminRequest.ICreate,
      },
    );
  typia.assert(request1);
  // 3. Create second member and submit admin request
  const member2Password = RandomGenerator.alphaNumeric(16);
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Auth = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: member2Password,
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member2Auth);
  const request2 =
    await generate_random_discussion_board_member_admin_requests_create(
      member2Connection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardAdminRequest.ICreate,
      },
    );
  typia.assert(request2);
  // 4. Super admin retrieves pending requests list
  const pendingList =
    await api.functional.discussionBoard.admin.admin_requests.pending.index(
      adminLoginConnection,
      {
        body: {
          status: "pending",
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(pendingList);
  // 5. Validate response structure
  TestValidator.equals(
    "pagination exists",
    pendingList.pagination !== undefined,
    true,
  );
  TestValidator.equals("pagination current", pendingList.pagination.current, 1);
  TestValidator.equals("pagination records", pendingList.pagination.records, 2);
  TestValidator.predicate(
    "pagination pages positive",
    pendingList.pagination.pages > 0,
  );
  TestValidator.predicate(
    "pagination limit positive",
    pendingList.pagination.limit > 0,
  );
  // 6. Validate data array
  TestValidator.equals("data array length", pendingList.data.length, 2);
  // 7. Validate each request has required fields
  for (const req of pendingList.data) {
    TestValidator.equals("request has id", req.id !== undefined, true);
    TestValidator.equals("request has reason", req.reason !== undefined, true);
    TestValidator.equals("request status is pending", req.status, "pending");
    TestValidator.equals(
      "request has submitted_at",
      req.submitted_at !== undefined,
      true,
    );
    TestValidator.equals("request reviewed_at is null", req.reviewed_at, null);
    // Validate member relation
    TestValidator.equals(
      "member relation exists",
      req.discussion_board_member !== undefined,
      true,
    );
    TestValidator.equals(
      "member has id",
      req.discussion_board_member.id !== undefined,
      true,
    );
    TestValidator.equals(
      "member has displayName",
      req.discussion_board_member.displayName !== undefined,
      true,
    );
  }
  // 8. Validate sorting (newest first)
  if (pendingList.data.length >= 2) {
    const firstSubmitted = new Date(pendingList.data[0].submitted_at).getTime();
    const secondSubmitted = new Date(
      pendingList.data[1].submitted_at,
    ).getTime();
    TestValidator.predicate(
      "sorted by submitted_at DESC",
      firstSubmitted >= secondSubmitted,
    );
  }
}
