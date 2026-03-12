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

export async function test_api_admin_request_search_by_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create and authenticate administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      href: "https://test.com/admin",
      referrer: "https://test.com/login",
    } satisfies IDiscussionBoardAdministrator.ILogin,
  });
  // 2. Setup: Create member accounts and submit admin requests with varied reasons
  const memberReasons = [
    "I want to become a moderator to help manage the community",
    "I have experience in content moderation and want to help",
    "I want to improve the platform by becoming an admin",
    "Need admin access for testing purposes",
    "I am passionate about this community and want to contribute more",
  ];
  const createdRequests: IDiscussionBoardAdminRequest[] = [];
  for (let i = 0; i < memberReasons.length; i++) {
    const memberConnection: api.IConnection = { host: connection.host };
    await authorize_member_join(memberConnection, {
      body: {
        email: `member${i}@test.com`,
        password: "1234",
        display_name: `Member ${i}`,
        href: "https://test.com/member",
        referrer: "https://test.com/join",
      },
    });
    const request =
      await generate_random_discussion_board_member_admin_requests_create(
        memberConnection,
        {
          body: {
            reason: memberReasons[i],
          },
        },
      );
    typia.assert(request);
    createdRequests.push(request);
  }
  // 3. Test: Search for requests containing "moderator" (case-insensitive)
  const searchResult1 =
    await api.functional.discussionBoard.administrator.admin_requests.index(
      adminConnection,
      {
        body: {
          search: "moderator",
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(searchResult1);
  TestValidator.predicate(
    "search returns requests containing 'moderator'",
    searchResult1.data.length > 0,
  );
  for (const req of searchResult1.data) {
    TestValidator.predicate(
      `request reason contains 'moderator' (case-insensitive)`,
      req.reason.toLowerCase().includes("moderator"),
    );
  }
  // 4. Test: Search for requests containing "admin" (should match multiple)
  const searchResult2 =
    await api.functional.discussionBoard.administrator.admin_requests.index(
      adminConnection,
      {
        body: {
          search: "admin",
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(searchResult2);
  TestValidator.predicate(
    "search returns requests containing 'admin'",
    searchResult2.data.length > 0,
  );
  for (const req of searchResult2.data) {
    TestValidator.predicate(
      `request reason contains 'admin' (case-insensitive)`,
      req.reason.toLowerCase().includes("admin"),
    );
  }
  // 5. Test: Search for non-existent term (should return empty results)
  const searchResult3 =
    await api.functional.discussionBoard.administrator.admin_requests.index(
      adminConnection,
      {
        body: {
          search: "xyznonexistent123",
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(searchResult3);
  TestValidator.equals(
    "search returns empty results for non-existent term",
    searchResult3.data.length,
    0,
  );
  // 6. Test: Search with pagination
  const searchResult4 =
    await api.functional.discussionBoard.administrator.admin_requests.index(
      adminConnection,
      {
        body: {
          search: "I",
          page: 1,
          limit: 2,
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(searchResult4);
  TestValidator.equals(
    "pagination limit is respected",
    searchResult4.pagination.limit,
    2,
  );
  TestValidator.equals(
    "current page is 1",
    searchResult4.pagination.current,
    1,
  );
  for (const req of searchResult4.data) {
    TestValidator.predicate(
      `request reason contains 'I' (case-insensitive)`,
      req.reason.toLowerCase().includes("i"),
    );
  }
  // 7. Test: Search with special characters
  const searchResult5 =
    await api.functional.discussionBoard.administrator.admin_requests.index(
      adminConnection,
      {
        body: {
          search: "community",
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(searchResult5);
  TestValidator.predicate(
    "search returns requests containing 'community'",
    searchResult5.data.length > 0,
  );
  for (const req of searchResult5.data) {
    TestValidator.predicate(
      `request reason contains 'community' (case-insensitive)`,
      req.reason.toLowerCase().includes("community"),
    );
  }
  // 8. Test: Case-insensitive search (uppercase search term)
  const searchResult6 =
    await api.functional.discussionBoard.administrator.admin_requests.index(
      adminConnection,
      {
        body: {
          search: "MODERATOR",
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(searchResult6);
  TestValidator.predicate(
    "uppercase search term matches lowercase text",
    searchResult6.data.length > 0,
  );
  for (const req of searchResult6.data) {
    TestValidator.predicate(
      `request reason contains 'moderator' (case-insensitive)`,
      req.reason.toLowerCase().includes("moderator"),
    );
  }
}
