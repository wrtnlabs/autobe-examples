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

export async function test_api_admin_request_list_status_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator account
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_admin_join(superAdminConnection, {
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
  typia.assert(superAdmin);
  TestValidator.predicate("super admin created", superAdmin.grade === "super");
  // 2. Create member accounts and submit admin requests
  const memberConnections: api.IConnection[] = [];
  const memberRequests: IDiscussionBoardAdminRequest[] = [];
  for (let i = 0; i < 3; i++) {
    const memberConnection: api.IConnection = { host: connection.host };
    const member = await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IDiscussionBoardMember.IJoin,
    });
    typia.assert(member);
    memberConnections.push(memberConnection);
    // Submit admin request
    const adminRequest =
      await generate_random_discussion_board_member_admin_requests_create(
        memberConnection,
        {
          body: {
            reason: RandomGenerator.content({
              paragraphs: 2,
              sentenceMin: 10,
              sentenceMax: 15,
            }),
          } satisfies IDiscussionBoardAdminRequest.ICreate,
        },
      );
    typia.assert(adminRequest);
    TestValidator.equals(
      "request status is pending",
      adminRequest.status,
      "pending",
    );
    TestValidator.predicate(
      "decided_at is null for pending",
      adminRequest.decided_at === null,
    );
    TestValidator.predicate(
      "admin is null for pending",
      adminRequest.admin === null,
    );
    memberRequests.push(adminRequest);
  }
  // 3. Query with status='pending' filter
  const pendingResult =
    await api.functional.discussionBoard.admin.admin_requests.index(
      superAdminConnection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 20,
          sort: "asc",
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(pendingResult);
  TestValidator.predicate(
    "pending requests exist",
    pendingResult.data.length >= 3,
  );
  TestValidator.predicate(
    "all pending have status pending",
    pendingResult.data.every((r) => r.status === "pending"),
  );
  TestValidator.predicate(
    "all pending have null decided_at",
    pendingResult.data.every((r) => r.decided_at === null),
  );
  TestValidator.predicate(
    "all pending have null admin",
    pendingResult.data.every((r) => r.admin === null),
  );
  // 4. Query with status='approved' filter (should be empty since we can't approve)
  const approvedResult =
    await api.functional.discussionBoard.admin.admin_requests.index(
      superAdminConnection,
      {
        body: {
          status: "approved",
          page: 1,
          limit: 20,
          sort: "asc",
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(approvedResult);
  TestValidator.equals("approved count", approvedResult.data.length, 0);
  // 5. Query with status='rejected' filter (should be empty since we can't reject)
  const rejectedResult =
    await api.functional.discussionBoard.admin.admin_requests.index(
      superAdminConnection,
      {
        body: {
          status: "rejected",
          page: 1,
          limit: 20,
          sort: "asc",
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(rejectedResult);
  TestValidator.equals("rejected count", rejectedResult.data.length, 0);
  // 6. Query without status filter (all requests)
  const allResult =
    await api.functional.discussionBoard.admin.admin_requests.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 20,
          sort: "asc",
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(allResult);
  TestValidator.predicate("all requests returned", allResult.data.length >= 3);
  TestValidator.predicate(
    "pagination records correct",
    allResult.pagination.records >= 3,
  );
  // 7. Verify member information is included for all requests
  for (const request of allResult.data) {
    TestValidator.predicate(
      "member id exists",
      request.member.id !== undefined,
    );
    TestValidator.predicate(
      "member display_name exists",
      request.member.display_name !== undefined,
    );
    TestValidator.predicate(
      "member has is_admin flag",
      typeof request.member.is_admin === "boolean",
    );
  }
  // 8. Verify pagination metadata
  TestValidator.predicate(
    "current page is 1",
    allResult.pagination.current >= 1,
  );
  TestValidator.predicate("limit is valid", allResult.pagination.limit > 0);
  TestValidator.predicate(
    "records is non-negative",
    allResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    allResult.pagination.pages >= 0,
  );
}
