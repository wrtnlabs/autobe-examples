import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorRequest";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorRequest";
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
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_member_requests_create } from "../../../generate/generate_random_discussion_board_member_requests_create";
import { prepare_random_discussion_board_administrator_request } from "../../../prepare/prepare_random_discussion_board_administrator_request";

export async function test_api_administrator_request_list_pagination_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin account
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 2. Create 16 member users with administrator requests
  const memberRequests: IDiscussionBoardAdministratorRequest[] = [];
  for (let i = 0; i < 16; i++) {
    const memberConnection: api.IConnection = { host: connection.host };
    const member = await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: `Member${i + 1}`,
        bio: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies IDiscussionBoardMember.IJoin,
    });
    typia.assert(member);
    // Create administrator request
    const requestConnection: api.IConnection = { host: connection.host };
    const createRequest = {
      reason: `Request from ${member.display_name} for admin privileges`,
      status: "pending" as const,
    } satisfies IDiscussionBoardAdministratorRequest.ICreate;
    const request = await api.functional.discussionBoard.member.requests.create(
      requestConnection,
      { body: createRequest },
    );
    typia.assert(request);
    memberRequests.push(request);
  }
  // 3. Test pagination with limit=5
  const limit5Response =
    await api.functional.discussionBoard.admin.admin.requests.index(
      superAdminConnection,
      {
        body: {
          limit: 5,
          page: 1,
        } satisfies IDiscussionBoardAdministratorRequest.IRequest,
      },
    );
  typia.assert(limit5Response);
  TestValidator.equals(
    "limit=5 returns 5 records",
    limit5Response.data.length,
    5,
  );
  TestValidator.equals(
    "limit=5 pagination limit correct",
    limit5Response.pagination.limit,
    5,
  );
  TestValidator.equals(
    "limit=5 total records correct",
    limit5Response.pagination.records,
    16,
  );
  TestValidator.equals(
    "limit=5 pages calculation correct",
    limit5Response.pagination.pages,
    4,
  );
  TestValidator.equals(
    "limit=5 current page is 1",
    limit5Response.pagination.current,
    1,
  );
  // 4. Test cursor-based pagination - get second page
  const cursorResponse =
    await api.functional.discussionBoard.admin.admin.requests.index(
      superAdminConnection,
      {
        body: {
          limit: 5,
          cursor:
            limit5Response.data[limit5Response.data.length - 1].submitted_at,
          sortBy: "submitted_at",
          sortOrder: "desc",
        } satisfies IDiscussionBoardAdministratorRequest.IRequest,
      },
    );
  typia.assert(cursorResponse);
  TestValidator.equals(
    "cursor pagination returns 5 records",
    cursorResponse.data.length,
    5,
  );
  TestValidator.notEquals(
    "cursor pagination different data",
    JSON.stringify(limit5Response.data.map((d) => d.submitted_at)),
    JSON.stringify(cursorResponse.data.map((d) => d.submitted_at)),
  );
  // 5. Test sorting by submitting_at ascending
  const ascendingResponse =
    await api.functional.discussionBoard.admin.admin.requests.index(
      superAdminConnection,
      {
        body: {
          sortBy: "submitted_at",
          sortOrder: "asc",
          limit: 16,
        } satisfies IDiscussionBoardAdministratorRequest.IRequest,
      },
    );
  typia.assert(ascendingResponse);
  TestValidator.equals(
    "ascending sort returns 16 records",
    ascendingResponse.data.length,
    16,
  );
  // Verify chronological order - older timestamps first
  for (let i = 1; i < ascendingResponse.data.length; i++) {
    TestValidator.predicate(
      "ascending timestamps correct",
      () =>
        ascendingResponse.data[i].submitted_at >=
        ascendingResponse.data[i - 1].submitted_at,
    );
  }
  // 6. Test sorting by submitting_at descending
  const descendingResponse =
    await api.functional.discussionBoard.admin.admin.requests.index(
      superAdminConnection,
      {
        body: {
          sortBy: "submitted_at",
          sortOrder: "desc",
          limit: 16,
        } satisfies IDiscussionBoardAdministratorRequest.IRequest,
      },
    );
  typia.assert(descendingResponse);
  TestValidator.equals(
    "descending sort returns 16 records",
    descendingResponse.data.length,
    16,
  );
  // Verify reverse chronological order - newer timestamps first
  for (let i = 1; i < descendingResponse.data.length; i++) {
    TestValidator.predicate(
      "descending timestamps correct",
      () =>
        descendingResponse.data[i].submitted_at <=
        descendingResponse.data[i - 1].submitted_at,
    );
  }
  // 7. Test boundary cases
  // Single record with limit=1
  const singleResponse =
    await api.functional.discussionBoard.admin.admin.requests.index(
      superAdminConnection,
      {
        body: {
          limit: 1,
          page: 1,
        } satisfies IDiscussionBoardAdministratorRequest.IRequest,
      },
    );
  typia.assert(singleResponse);
  TestValidator.equals(
    "limit=1 returns single record",
    singleResponse.data.length,
    1,
  );
  TestValidator.equals(
    "limit=1 pagination limit correct",
    singleResponse.pagination.limit,
    1,
  );
  // Maximum limit with limit=100
  const maxLimitResponse =
    await api.functional.discussionBoard.admin.admin.requests.index(
      superAdminConnection,
      {
        body: {
          limit: 100,
          page: 1,
        } satisfies IDiscussionBoardAdministratorRequest.IRequest,
      },
    );
  typia.assert(maxLimitResponse);
  TestValidator.equals(
    "limit=100 returns all 16 records",
    maxLimitResponse.data.length,
    16,
  );
  TestValidator.equals(
    "limit=100 pagination limit correct",
    maxLimitResponse.pagination.limit,
    100,
  );
  // First page with explicit page number
  const firstPageResponse =
    await api.functional.discussionBoard.admin.admin.requests.index(
      superAdminConnection,
      {
        body: {
          limit: 5,
          page: 1,
        } satisfies IDiscussionBoardAdministratorRequest.IRequest,
      },
    );
  typia.assert(firstPageResponse);
  TestValidator.equals(
    "explicit page=1 returns first page",
    firstPageResponse.pagination.current,
    1,
  );
}
