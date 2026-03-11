import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAdmin";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoMember";
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

export async function test_api_member_management_admin_pagination_and_date_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication using available utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IMultiUserTodoAdmin.ILogin;
  // Create admin account first using SDK since we don't have authorize_admin_join utility
  await api.functional.multiUserTodo.auth.admin.join(adminConnection, {
    body: {
      ...adminCredentials,
      display_name: RandomGenerator.name(),
    } satisfies IMultiUserTodoAdmin.IJoin,
  });
  // Then login to get proper authentication
  await authorize_admin_login(adminConnection, {
    body: adminCredentials,
  });
  // 2. Create multiple member accounts with staggered creation dates
  const memberAccounts: IMultiUserTodoMember.ISummary[] = [];
  // Create 15 member accounts with different creation dates
  for (let i = 0; i < 15; i++) {
    const memberCredentials = {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin;
    const memberConnection: api.IConnection = { host: connection.host };
    const member = await api.functional.multiUserTodo.auth.member.join(
      memberConnection,
      {
        body: memberCredentials,
      },
    );
    memberAccounts.push({
      id: member.id,
      email: member.email,
      display_name: member.display_name,
      created_at: member.created_at,
    } satisfies IMultiUserTodoMember.ISummary);
    // Add small delay to ensure different timestamps
    if (i < 14) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }
  // Sort member accounts by creation date for date filtering tests
  memberAccounts.sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  // 3. Test pagination with different page sizes
  // Test page 1 with limit 5
  const page1Response = await api.functional.multiUserTodo.members.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 5,
      } satisfies IMultiUserTodoMember.IRequest,
    },
  );
  typia.assert(page1Response);
  TestValidator.equals(
    "page 1 should have 5 items",
    page1Response.data.length,
    5,
  );
  TestValidator.equals(
    "page 1 current page",
    page1Response.pagination.current,
    1,
  );
  TestValidator.equals("page 1 limit", page1Response.pagination.limit, 5);
  TestValidator.equals(
    "page 1 total records",
    page1Response.pagination.records,
    15,
  );
  TestValidator.equals("page 1 total pages", page1Response.pagination.pages, 3);
  // Test page 2 with limit 5
  const page2Response = await api.functional.multiUserTodo.members.index(
    adminConnection,
    {
      body: {
        page: 2,
        limit: 5,
      } satisfies IMultiUserTodoMember.IRequest,
    },
  );
  typia.assert(page2Response);
  TestValidator.equals(
    "page 2 should have 5 items",
    page2Response.data.length,
    5,
  );
  TestValidator.equals(
    "page 2 current page",
    page2Response.pagination.current,
    2,
  );
  // Test page 3 with limit 5 (last page)
  const page3Response = await api.functional.multiUserTodo.members.index(
    adminConnection,
    {
      body: {
        page: 3,
        limit: 5,
      } satisfies IMultiUserTodoMember.IRequest,
    },
  );
  typia.assert(page3Response);
  TestValidator.equals(
    "page 3 should have 5 items",
    page3Response.data.length,
    5,
  );
  TestValidator.equals(
    "page 3 current page",
    page3Response.pagination.current,
    3,
  );
  // Test page 4 (beyond available pages)
  const page4Response = await api.functional.multiUserTodo.members.index(
    adminConnection,
    {
      body: {
        page: 4,
        limit: 5,
      } satisfies IMultiUserTodoMember.IRequest,
    },
  );
  typia.assert(page4Response);
  TestValidator.equals("page 4 should be empty", page4Response.data.length, 0);
  TestValidator.equals(
    "page 4 current page",
    page4Response.pagination.current,
    4,
  );
  // Test minimum limit (1)
  const minLimitResponse = await api.functional.multiUserTodo.members.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 1,
      } satisfies IMultiUserTodoMember.IRequest,
    },
  );
  typia.assert(minLimitResponse);
  TestValidator.equals(
    "min limit should have 1 item",
    minLimitResponse.data.length,
    1,
  );
  TestValidator.equals("min limit value", minLimitResponse.pagination.limit, 1);
  // Test maximum limit (100)
  const maxLimitResponse = await api.functional.multiUserTodo.members.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IMultiUserTodoMember.IRequest,
    },
  );
  typia.assert(maxLimitResponse);
  TestValidator.equals(
    "max limit should return all items",
    maxLimitResponse.data.length,
    15,
  );
  TestValidator.equals(
    "max limit value",
    maxLimitResponse.pagination.limit,
    100,
  );
  // 4. Test date range filtering
  // Get middle creation date for filtering
  const middleIndex = Math.floor(memberAccounts.length / 2);
  const middleDate = memberAccounts[middleIndex].created_at;
  // Test created_after filter
  const createdAfterResponse = await api.functional.multiUserTodo.members.index(
    adminConnection,
    {
      body: {
        created_after: middleDate,
        limit: 100,
      } satisfies IMultiUserTodoMember.IRequest,
    },
  );
  typia.assert(createdAfterResponse);
  const expectedAfterCount = memberAccounts.filter(
    (member) => new Date(member.created_at) > new Date(middleDate),
  ).length;
  TestValidator.equals(
    "created_after should return correct count",
    createdAfterResponse.data.length,
    expectedAfterCount,
  );
  // Test created_before filter
  const createdBeforeResponse =
    await api.functional.multiUserTodo.members.index(adminConnection, {
      body: {
        created_before: middleDate,
        limit: 100,
      } satisfies IMultiUserTodoMember.IRequest,
    });
  typia.assert(createdBeforeResponse);
  const expectedBeforeCount = memberAccounts.filter(
    (member) => new Date(member.created_at) < new Date(middleDate),
  ).length;
  TestValidator.equals(
    "created_before should return correct count",
    createdBeforeResponse.data.length,
    expectedBeforeCount,
  );
  // Test combined date filters
  const firstDate = memberAccounts[0].created_at;
  const lastDate = memberAccounts[memberAccounts.length - 1].created_at;
  const combinedDateResponse = await api.functional.multiUserTodo.members.index(
    adminConnection,
    {
      body: {
        created_after: firstDate,
        created_before: lastDate,
        limit: 100,
      } satisfies IMultiUserTodoMember.IRequest,
    },
  );
  typia.assert(combinedDateResponse);
  const expectedCombinedCount = memberAccounts.filter(
    (member) =>
      new Date(member.created_at) > new Date(firstDate) &&
      new Date(member.created_at) < new Date(lastDate),
  ).length;
  TestValidator.equals(
    "combined date filters should return correct count",
    combinedDateResponse.data.length,
    expectedCombinedCount,
  );
  // 5. Test search functionality
  const searchMember = memberAccounts[0];
  const searchResponse = await api.functional.multiUserTodo.members.index(
    adminConnection,
    {
      body: {
        search: searchMember.display_name,
        limit: 100,
      } satisfies IMultiUserTodoMember.IRequest,
    },
  );
  typia.assert(searchResponse);
  TestValidator.predicate(
    "search should return matching members",
    searchResponse.data.some(
      (member) => member.display_name === searchMember.display_name,
    ),
  );
  // 6. Test exact email match
  const emailResponse = await api.functional.multiUserTodo.members.index(
    adminConnection,
    {
      body: {
        email: searchMember.email,
        limit: 100,
      } satisfies IMultiUserTodoMember.IRequest,
    },
  );
  typia.assert(emailResponse);
  TestValidator.equals(
    "email filter should return exact match",
    emailResponse.data.length,
    1,
  );
  TestValidator.equals(
    "email filter should match correct member",
    emailResponse.data[0].email,
    searchMember.email,
  );
  // 7. Test display_name filter
  const nameResponse = await api.functional.multiUserTodo.members.index(
    adminConnection,
    {
      body: {
        display_name: searchMember.display_name,
        limit: 100,
      } satisfies IMultiUserTodoMember.IRequest,
    },
  );
  typia.assert(nameResponse);
  TestValidator.equals(
    "display_name filter should return exact match",
    nameResponse.data.length,
    1,
  );
  TestValidator.equals(
    "display_name filter should match correct member",
    nameResponse.data[0].display_name,
    searchMember.display_name,
  );
  // 8. Test active status filter (default should be active members only)
  const activeResponse = await api.functional.multiUserTodo.members.index(
    adminConnection,
    {
      body: {
        active: true,
        limit: 100,
      } satisfies IMultiUserTodoMember.IRequest,
    },
  );
  typia.assert(activeResponse);
  TestValidator.equals(
    "active filter should return all members",
    activeResponse.data.length,
    15,
  );
}
