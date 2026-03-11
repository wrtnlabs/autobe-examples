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

export async function test_api_admin_request_list_pending_queue(
  connection: api.IConnection,
): Promise<void> {
  // 1. Test empty pending queue first
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
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
  typia.assert(adminAuth);
  // Query empty pending queue
  const emptyResult =
    await api.functional.discussionBoard.admin.admin_requests.index(
      adminConnection,
      {
        body: {
          status: "pending",
          sort: "asc",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty queue records",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals("empty queue pages", emptyResult.pagination.pages, 0);
  TestValidator.equals("empty queue data length", emptyResult.data.length, 0);
  // 2. Create multiple member accounts and submit admin requests
  const memberConnections: api.IConnection[] = [];
  const memberEmails: string[] = [];
  for (let i = 0; i < 5; i++) {
    const memberConnection: api.IConnection = { host: connection.host };
    const email = typia.random<string & tags.Format<"email">>();
    memberEmails.push(email);
    await authorize_member_join(memberConnection, {
      body: {
        email,
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IDiscussionBoardMember.IJoin,
    });
    memberConnections.push(memberConnection);
    // Submit admin request from each member
    await generate_random_discussion_board_member_admin_requests_create(
      memberConnection,
      {
        body: {
          reason: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 10,
            sentenceMax: 15,
            wordMin: 4,
            wordMax: 8,
          }),
        },
      },
    );
  }
  // 3. Query pending queue with multiple requests
  const pendingResult =
    await api.functional.discussionBoard.admin.admin_requests.index(
      adminConnection,
      {
        body: {
          status: "pending",
          sort: "asc",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(pendingResult);
  // 4. Verify pagination metadata
  TestValidator.equals(
    "pending queue records",
    pendingResult.pagination.records,
    5,
  );
  TestValidator.equals(
    "pending queue pages",
    pendingResult.pagination.pages,
    1,
  );
  TestValidator.equals(
    "pending queue current page",
    pendingResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pending queue limit",
    pendingResult.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pending queue data length",
    pendingResult.data.length,
    5,
  );
  // 5. Verify each request has required fields (business logic, not type validation)
  for (const request of pendingResult.data) {
    TestValidator.predicate("reason not empty", request.reason.length >= 50);
    TestValidator.equals("status is pending", request.status, "pending");
    TestValidator.equals(
      "decided_at is null for pending",
      request.decided_at,
      null,
    );
    TestValidator.predicate("member exists", request.member !== null);
    TestValidator.predicate(
      "member has display_name",
      request.member.display_name.length > 0,
    );
    TestValidator.equals("admin is null for pending", request.admin, null);
  }
  // 6. Verify ascending order (oldest first)
  for (let i = 1; i < pendingResult.data.length; i++) {
    const prev = new Date(pendingResult.data[i - 1].submitted_at).getTime();
    const curr = new Date(pendingResult.data[i].submitted_at).getTime();
    TestValidator.predicate(
      `sorted ascending: item ${i - 1} <= item ${i}`,
      prev <= curr,
    );
  }
  // 7. Test pagination with smaller limit
  const paginatedResult =
    await api.functional.discussionBoard.admin.admin_requests.index(
      adminConnection,
      {
        body: {
          status: "pending",
          sort: "asc",
          page: 1,
          limit: 2,
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(paginatedResult);
  TestValidator.equals(
    "paginated records",
    paginatedResult.pagination.records,
    5,
  );
  TestValidator.equals("paginated pages", paginatedResult.pagination.pages, 3);
  TestValidator.equals(
    "paginated current page",
    paginatedResult.pagination.current,
    1,
  );
  TestValidator.equals("paginated limit", paginatedResult.pagination.limit, 2);
  TestValidator.equals("paginated data length", paginatedResult.data.length, 2);
  // Get second page
  const page2Result =
    await api.functional.discussionBoard.admin.admin_requests.index(
      adminConnection,
      {
        body: {
          status: "pending",
          sort: "asc",
          page: 2,
          limit: 2,
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(page2Result);
  TestValidator.equals("page 2 current", page2Result.pagination.current, 2);
  TestValidator.equals("page 2 data length", page2Result.data.length, 2);
  // Verify page 2 items are after page 1 items in time
  const lastPage1 = new Date(paginatedResult.data[1].submitted_at).getTime();
  const firstPage2 = new Date(page2Result.data[0].submitted_at).getTime();
  TestValidator.predicate("page 2 after page 1", lastPage1 <= firstPage2);
  // Get third page
  const page3Result =
    await api.functional.discussionBoard.admin.admin_requests.index(
      adminConnection,
      {
        body: {
          status: "pending",
          sort: "asc",
          page: 3,
          limit: 2,
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(page3Result);
  TestValidator.equals("page 3 current", page3Result.pagination.current, 3);
  TestValidator.equals("page 3 data length", page3Result.data.length, 1);
}
