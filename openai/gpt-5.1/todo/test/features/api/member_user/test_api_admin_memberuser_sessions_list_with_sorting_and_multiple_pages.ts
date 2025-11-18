import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMemberUser";
import type { IPageITodoAppMemberUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMemberUserSession";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUser";
import type { ITodoAppMemberUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserSession";

/**
 * Validate that an authenticated admin can paginate and sort member user
 * sessions.
 *
 * Business goals:
 *
 * - Ensure admin registration and authentication works (join endpoint).
 * - Ensure admin member user search returns at least one member user when data
 *   exists, but gracefully skip the rest of the test when there are none.
 * - Verify that the sessions listing endpoint correctly applies page/limit and
 *   returns sessions for the given member user only.
 * - Validate that sorting by created_at in descending order is consistent within
 *   each page, and cross-page uniqueness is respected when enough sessions
 *   exist.
 */
export async function test_api_admin_memberuser_sessions_list_with_sorting_and_multiple_pages(
  connection: api.IConnection,
) {
  // 1. Register an admin and authenticate (token handled by SDK).
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    display_name: RandomGenerator.name(),
    status: "active",
    ip: "127.0.0.1",
    href: "https://admin.todoapp.local/join" as string & tags.Format<"uri">,
    referrer: "https://admin.todoapp.local/" as string & tags.Format<"uri">,
  } satisfies ITodoAppAdminUser.IJoin;

  const adminAuthorized: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. As admin, search member users and pick one.
  const memberSearchBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
    order_by: "created_at",
    order_direction: "desc",
  } satisfies ITodoAppMemberUser.IRequest;

  const memberPage: IPageITodoAppMemberUser.ISummary =
    await api.functional.todoApp.adminUser.memberUsers.index(connection, {
      body: memberSearchBody,
    });
  typia.assert(memberPage);

  TestValidator.predicate(
    "member search returns pagination",
    () =>
      memberPage.pagination.limit >= 0 && memberPage.pagination.current >= 0,
  );

  TestValidator.predicate(
    "member search data length within limit",
    () => memberPage.data.length <= memberPage.pagination.limit,
  );

  const hasMember = memberPage.data.length > 0;
  if (!hasMember) return;

  const targetMember: ITodoAppMemberUser.ISummary = memberPage.data[0];

  // 3. Request first page of sessions for the selected member user.
  const sessionsRequestPage1 = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 5 as number & tags.Type<"int32"> & tags.Minimum<1>,
    orderBy: "created_at",
    orderDirection: "desc",
  } satisfies ITodoAppMemberUserSession.IRequest;

  const page1: IPageITodoAppMemberUserSession.ISummary =
    await api.functional.todoApp.adminUser.memberUsers.sessions.index(
      connection,
      {
        memberUserId: targetMember.id,
        body: sessionsRequestPage1,
      },
    );
  typia.assert(page1);

  TestValidator.equals(
    "page1 pagination.current should be 1",
    page1.pagination.current,
    1 as number & tags.Type<"int32"> & tags.Minimum<0>,
  );
  TestValidator.equals(
    "page1 pagination.limit should be 5",
    page1.pagination.limit,
    5 as number & tags.Type<"int32"> & tags.Minimum<0>,
  );
  TestValidator.predicate(
    "page1 data length <= limit",
    () => page1.data.length <= page1.pagination.limit,
  );

  for (const session of page1.data) {
    TestValidator.equals(
      "session.memberUser.id matches target member id on page1",
      session.memberUser.id,
      targetMember.id,
    );
  }

  // Verify descending created_at ordering within page1.
  for (let i = 1; i < page1.data.length; ++i) {
    const prev = page1.data[i - 1];
    const curr = page1.data[i];
    TestValidator.predicate(
      `page1 created_at[${i - 1}] >= created_at[${i}] in desc order`,
      () => prev.created_at >= curr.created_at,
    );
  }

  // 4. Request second page with the same criteria.
  const sessionsRequestPage2 = {
    page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 5 as number & tags.Type<"int32"> & tags.Minimum<1>,
    orderBy: "created_at",
    orderDirection: "desc",
  } satisfies ITodoAppMemberUserSession.IRequest;

  const page2: IPageITodoAppMemberUserSession.ISummary =
    await api.functional.todoApp.adminUser.memberUsers.sessions.index(
      connection,
      {
        memberUserId: targetMember.id,
        body: sessionsRequestPage2,
      },
    );
  typia.assert(page2);

  TestValidator.equals(
    "page2 pagination.current should be 2",
    page2.pagination.current,
    2 as number & tags.Type<"int32"> & tags.Minimum<0>,
  );
  TestValidator.equals(
    "page2 pagination.limit should be 5",
    page2.pagination.limit,
    5 as number & tags.Type<"int32"> & tags.Minimum<0>,
  );
  TestValidator.predicate(
    "page2 data length <= limit",
    () => page2.data.length <= page2.pagination.limit,
  );

  for (const session of page2.data) {
    TestValidator.equals(
      "session.memberUser.id matches target member id on page2",
      session.memberUser.id,
      targetMember.id,
    );
  }

  for (let i = 1; i < page2.data.length; ++i) {
    const prev = page2.data[i - 1];
    const curr = page2.data[i];
    TestValidator.predicate(
      `page2 created_at[${i - 1}] >= created_at[${i}] in desc order`,
      () => prev.created_at >= curr.created_at,
    );
  }

  // 5. Cross-page uniqueness and ordering checks if there are sufficient sessions.
  const allSessions = [...page1.data, ...page2.data];
  const idSet = new Set(allSessions.map((s) => s.id));

  TestValidator.predicate(
    "no duplicate session ids across page1 and page2",
    () => idSet.size === allSessions.length,
  );

  if (page1.data.length >= 5 && page2.data.length >= 5) {
    TestValidator.equals(
      "combined pages have 10 unique session ids when both pages full",
      idSet.size,
      10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    );
  }

  if (page1.data.length > 0 && page2.data.length > 0) {
    const lastPage1 = page1.data[page1.data.length - 1];
    const firstPage2 = page2.data[0];
    TestValidator.predicate(
      "last created_at on page1 should be >= first created_at on page2",
      () => lastPage1.created_at >= firstPage2.created_at,
    );
  }
}
