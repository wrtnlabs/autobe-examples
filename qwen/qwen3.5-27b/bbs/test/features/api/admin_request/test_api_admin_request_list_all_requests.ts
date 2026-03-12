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
 * Test that an authenticated administrator can retrieve a paginated list of all administrator privilege escalation requests.
 * The test creates multiple admin requests as a member, then authenticates as an administrator and validates the paginated list response.
 */
export async function test_api_admin_request_list_all_requests(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  // 2. Submit multiple admin requests as member
  const requests: IDiscussionBoardAdminRequest[] = [];
  for (let i = 0; i < 3; i++) {
    const request =
      await generate_random_discussion_board_member_admin_requests_create(
        memberConnection,
        {
          body: {
            reason: `I want to become an administrator to help moderate the community - request ${i + 1}`,
          },
        },
      );
    typia.assert(request);
    requests.push(request);
  }
  // 3. Create and authenticate administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdministrator.IJoin,
  });
  // 4. Retrieve all admin requests as administrator
  const page =
    await api.functional.discussionBoard.administrator.admin_requests.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(page);
  // 5. Validate pagination metadata
  TestValidator.equals("current page is 1", page.pagination.current, 1);
  TestValidator.equals("limit is 20", page.pagination.limit, 20);
  TestValidator.predicate("has records", page.pagination.records >= 3);
  TestValidator.predicate("has at least 1 page", page.pagination.pages >= 1);
  // 6. Validate request summaries
  TestValidator.equals(
    "data array length matches records count",
    page.data.length,
    page.pagination.records,
  );
  for (const summary of page.data) {
    // Validate member information exists
    TestValidator.predicate(
      "member has id",
      summary.member.id !== undefined && summary.member.id !== null,
    );
    TestValidator.predicate(
      "member has email",
      summary.member.email !== undefined && summary.member.email !== null,
    );
    // Validate request reason exists
    TestValidator.predicate(
      "request has reason",
      summary.reason !== undefined && summary.reason !== null,
    );
    // Validate status is pending (since we just created them)
    TestValidator.equals("status is pending", summary.status, "pending");
    // Validate submission timestamp exists
    TestValidator.predicate(
      "submitted_at exists",
      summary.submitted_at !== undefined && summary.submitted_at !== null,
    );
    // Validate reviewing administrator is null for pending requests
    TestValidator.equals(
      "reviewing_administrator is null for pending",
      summary.reviewingAdministrator,
      null,
    );
  }
  // 7. Validate sorting by submission date (descending)
  if (page.data.length > 1) {
    for (let i = 1; i < page.data.length; i++) {
      TestValidator.predicate(
        `request ${i} submitted before or at same time as request ${i - 1}`,
        new Date(page.data[i].submitted_at).getTime() <=
          new Date(page.data[i - 1].submitted_at).getTime(),
      );
    }
  }
  // 8. Verify all created requests are included
  const returnedMemberEmails = page.data.map((r) => r.member.email);
  const createdMemberEmail = requests[0].member.email;
  TestValidator.predicate(
    "all requests are from the created member",
    returnedMemberEmails.every((email) => email === createdMemberEmail),
  );
}
