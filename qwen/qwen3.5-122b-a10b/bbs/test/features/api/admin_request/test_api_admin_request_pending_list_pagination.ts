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

export async function test_api_admin_request_pending_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 2. Create 5 member accounts and submit admin requests
  const members: {
    connection: api.IConnection;
    email: string;
    password: string;
    request: IDiscussionBoardAdminRequest;
  }[] = [];
  for (let i = 0; i < 5; i++) {
    const memberConnection: api.IConnection = { host: connection.host };
    const memberAuth = await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardMember.IJoin,
    });
    typia.assert(memberAuth);
    const adminRequest =
      await generate_random_discussion_board_member_admin_requests_create(
        memberConnection,
        {
          body: {
            reason: `Request for administrator privileges ${i + 1}`,
          } satisfies IDiscussionBoardAdminRequest.ICreate,
        },
      );
    typia.assert(adminRequest);
    members.push({
      connection: memberConnection,
      email: memberAuth.email,
      password: memberAuth.token.access,
      request: adminRequest,
    });
  }
  // 3. Test pagination with limit=2, page=1
  const page1 =
    await api.functional.discussionBoard.admin.admin_requests.pending.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 2,
          status: "pending",
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(page1);
  TestValidator.equals("page 1 has 2 records", page1.data.length, 2);
  TestValidator.equals("pagination current page", page1.pagination.current, 1);
  TestValidator.equals("pagination limit", page1.pagination.limit, 2);
  TestValidator.equals("pagination total records", page1.pagination.records, 5);
  TestValidator.equals("pagination total pages", page1.pagination.pages, 3);
  // 4. Test pagination with page=2
  const page2 =
    await api.functional.discussionBoard.admin.admin_requests.pending.index(
      superAdminConnection,
      {
        body: {
          page: 2,
          limit: 2,
          status: "pending",
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(page2);
  TestValidator.equals("page 2 has 2 records", page2.data.length, 2);
  TestValidator.equals("page 2 current page", page2.pagination.current, 2);
  TestValidator.notEquals(
    "page 2 has different records than page 1",
    page2.data[0].id,
    page1.data[0].id,
  );
  // 5. Test pagination with page=3 (last page)
  const page3 =
    await api.functional.discussionBoard.admin.admin_requests.pending.index(
      superAdminConnection,
      {
        body: {
          page: 3,
          limit: 2,
          status: "pending",
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(page3);
  TestValidator.equals("page 3 has 1 record", page3.data.length, 1);
  TestValidator.equals("page 3 current page", page3.pagination.current, 3);
  // 6. Verify descending order by submitted_at
  const allRequests = page1.data.concat(page2.data, page3.data);
  for (let i = 0; i < allRequests.length - 1; i++) {
    TestValidator.predicate(
      `request ${i} submitted before request ${i + 1}`,
      new Date(allRequests[i].submitted_at) >=
        new Date(allRequests[i + 1].submitted_at),
    );
  }
  // 7. Test with larger limit (limit=10, should return all 5)
  const largePage =
    await api.functional.discussionBoard.admin.admin_requests.pending.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          status: "pending",
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(largePage);
  TestValidator.equals(
    "large limit returns all records",
    largePage.data.length,
    5,
  );
  TestValidator.equals(
    "large limit pagination pages",
    largePage.pagination.pages,
    1,
  );
}
