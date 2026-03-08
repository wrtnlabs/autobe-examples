import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test super administrator endpoint for retrieving pending administrator requests with pagination support.
 * Creates multiple members who submit administrator requests and verifies pagination functionality.
 */
export async function test_api_super_admin_retrieve_pending_requests_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin and login
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: "superadmin@test.com",
      password: "1234",
      display_name: "Super Admin",
      bio: "Super administrator account for testing",
      href: "http://example.com",
      referrer: "http://example.com/ref",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  await authorize_super_admin_login(superAdminConnection, {
    body: {
      email: "superadmin@test.com",
      password: "1234",
    } satisfies IDiscussionBoardSuperAdmin.ILogin,
  });
  // 2. Create multiple member users
  const members = await ArrayUtil.asyncRepeat(5, async (index) => {
    const memberConnection: api.IConnection = { host: connection.host };
    const member = await authorize_member_join(memberConnection, {
      body: {
        email: `member${index}@test.com`,
        password: "1234",
        display_name: `Member ${index}`,
        bio: `Bio for member ${index}`,
      } satisfies IDiscussionBoardMember.IJoin,
    });
    typia.assert(member);
    return member;
  });
  // 3. Retrieve pending requests with pagination (limit=2)
  const firstPage =
    await api.functional.discussionBoard.superAdmin.admin.requests.index(
      superAdminConnection,
      {
        body: {
          status: "pending",
          limit: 2,
          page: 1,
        } satisfies IDiscussionBoardAdministratorRequest.IRequest,
      },
    );
  typia.assert(firstPage);
  // 4. Verify first page pagination metadata
  TestValidator.equals("first page current", firstPage.pagination.current, 1);
  TestValidator.equals("first page limit", firstPage.pagination.limit, 2);
  TestValidator.predicate(
    "first page records > 0",
    firstPage.pagination.records > 0,
  );
  TestValidator.predicate(
    "first page pages > 0",
    firstPage.pagination.pages > 0,
  );
  // 5. Verify data structure
  TestValidator.equals("first page data length", firstPage.data.length, 2);
  firstPage.data.forEach((request) => {
    typia.assert(request);
    TestValidator.equals("request status", request.status, "pending");
    TestValidator.predicate(
      "has submitted_at",
      typeof request.submitted_at === "string",
    );
    TestValidator.predicate(
      "has rejection_reason",
      request.rejection_reason === null ||
        typeof request.rejection_reason === "string",
    );
  });
  // 6. Test cursor-based pagination (second page)
  if (firstPage.data.length > 0) {
    const secondPage =
      await api.functional.discussionBoard.superAdmin.admin.requests.index(
        superAdminConnection,
        {
          body: {
            status: "pending",
            limit: 2,
            page: 2,
            cursor: firstPage.data[firstPage.data.length - 1].submitted_at,
          } satisfies IDiscussionBoardAdministratorRequest.IRequest,
        },
      );
    typia.assert(secondPage);
    // Verify second page
    TestValidator.equals(
      "second page current",
      secondPage.pagination.current,
      2,
    );
    TestValidator.equals("second page limit", secondPage.pagination.limit, 2);
    // Verify we got different data
    TestValidator.notEquals(
      "pages have different data",
      firstPage.data[0].submitted_at,
      secondPage.data[0]?.submitted_at,
    );
  }
  // 7. Verify total record count matches expected
  if (members.length > 0) {
    TestValidator.predicate(
      "records count accurate",
      firstPage.pagination.records >= members.length,
    );
  }
  // 8. Test with different pagination parameters
  const fullPage =
    await api.functional.discussionBoard.superAdmin.admin.requests.index(
      superAdminConnection,
      {
        body: {
          status: "pending",
          limit: 100,
          page: 1,
        } satisfies IDiscussionBoardAdministratorRequest.IRequest,
      },
    );
  typia.assert(fullPage);
  // Verify consistency across pagination
  TestValidator.equals(
    "all records match",
    fullPage.data.length,
    firstPage.pagination.records,
  );
}
