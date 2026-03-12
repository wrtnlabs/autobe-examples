import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMemberSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test member session filtering by date range and IP address.
 *
 * This test validates that members can filter their authentication sessions
 * using date range and IP address criteria for security auditing purposes.
 * It tests individual filters as well as combined filter scenarios.
 */
export async function test_api_member_session_list_date_range_and_ip_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.Format<"password">>();
  await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  // 2. Create multiple sessions with different IP addresses
  const testIps = ArrayUtil.repeat(5, () =>
    typia.random<string & tags.Format<"ipv4">>(),
  );
  // 3. Login multiple times to create sessions with different IPs
  for (const testIp of testIps) {
    const sessionConnection: api.IConnection = { host: connection.host };
    await authorize_member_login(sessionConnection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: testIp,
      } satisfies IMultiUserTodoMember.ILogin,
    });
  }
  // 4. Fetch all sessions to use for testing
  const allSessionsResponse =
    await api.functional.multiUserTodo.member.sessions.index(memberConnection, {
      body: {
        limit: 100,
      } satisfies IMultiUserTodoMemberSession.IRequest,
    });
  typia.assert(allSessionsResponse);
  const allSessions = allSessionsResponse.data;
  // Verify we have sessions to test with
  TestValidator.predicate(
    "sessions created for testing",
    allSessions.length > 0,
  );
  // 5. Test Date Range Filter
  const now = new Date();
  const startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
  const endDate = new Date();
  const dateFilteredResponse =
    await api.functional.multiUserTodo.member.sessions.index(memberConnection, {
      body: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      } satisfies IMultiUserTodoMemberSession.IRequest,
    });
  typia.assert(dateFilteredResponse);
  // Verify all sessions are within the date range
  for (const session of dateFilteredResponse.data) {
    const sessionDate = new Date(session.created_at);
    TestValidator.predicate(
      `session ${session.id} created_at >= startDate`,
      sessionDate >= startDate,
    );
    TestValidator.predicate(
      `session ${session.id} created_at <= endDate`,
      sessionDate <= endDate,
    );
  }
  // Verify pagination metadata
  TestValidator.predicate(
    "date filtered pagination records count valid",
    dateFilteredResponse.pagination.records >= dateFilteredResponse.data.length,
  );
  // 6. Test IP Address Filter with partial matching
  const firstSessionIp = allSessions[0].ip;
  const ipPrefix = firstSessionIp.substring(0, firstSessionIp.lastIndexOf("."));
  const ipFilteredResponse =
    await api.functional.multiUserTodo.member.sessions.index(memberConnection, {
      body: {
        ip: ipPrefix,
      } satisfies IMultiUserTodoMemberSession.IRequest,
    });
  typia.assert(ipFilteredResponse);
  // Verify all sessions match the IP filter
  for (const session of ipFilteredResponse.data) {
    TestValidator.predicate(
      `session ${session.id} IP contains filter prefix "${ipPrefix}"`,
      session.ip.includes(ipPrefix),
    );
  }
  // Verify at least the first session is included
  TestValidator.predicate(
    "first session included in IP filtered results",
    ipFilteredResponse.data.some((s) => s.ip === firstSessionIp),
  );
  // 7. Test Combined Filters (Date Range + IP)
  const combinedResponse =
    await api.functional.multiUserTodo.member.sessions.index(memberConnection, {
      body: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        ip: ipPrefix,
      } satisfies IMultiUserTodoMemberSession.IRequest,
    });
  typia.assert(combinedResponse);
  // Verify AND logic: all sessions must match both filters
  for (const session of combinedResponse.data) {
    const sessionDate = new Date(session.created_at);
    TestValidator.predicate(
      `combined filter: session ${session.id} within date range`,
      sessionDate >= startDate && sessionDate <= endDate,
    );
    TestValidator.predicate(
      `combined filter: session ${session.id} IP matches`,
      session.ip.includes(ipPrefix),
    );
  }
  // Combined results should be subset of both individual filters
  TestValidator.predicate(
    "combined filter results <= date filtered results",
    combinedResponse.data.length <= dateFilteredResponse.data.length,
  );
  TestValidator.predicate(
    "combined filter results <= IP filtered results",
    combinedResponse.data.length <= ipFilteredResponse.data.length,
  );
  // 8. Test Empty Results with Non-Matching IP
  const nonMatchingIp = "0.0.0.1"; // Valid IPv4 that shouldn't exist
  const emptyResponse =
    await api.functional.multiUserTodo.member.sessions.index(memberConnection, {
      body: {
        ip: nonMatchingIp,
      } satisfies IMultiUserTodoMemberSession.IRequest,
    });
  typia.assert(emptyResponse);
  TestValidator.equals(
    "no sessions match non-existent IP",
    emptyResponse.data.length,
    0,
  );
  TestValidator.equals(
    "empty results pagination records",
    emptyResponse.pagination.records,
    0,
  );
  // 9. Test Pagination with Filters
  const paginatedResponse =
    await api.functional.multiUserTodo.member.sessions.index(memberConnection, {
      body: {
        startDate: startDate.toISOString(),
        limit: 2,
        page: 1,
      } satisfies IMultiUserTodoMemberSession.IRequest,
    });
  typia.assert(paginatedResponse);
  TestValidator.equals(
    "pagination limit respected",
    paginatedResponse.data.length,
    Math.min(2, dateFilteredResponse.data.length),
  );
  TestValidator.equals(
    "pagination current page",
    paginatedResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit in metadata",
    paginatedResponse.pagination.limit,
    2,
  );
  // Verify pagination metadata consistency
  TestValidator.predicate(
    "pagination records consistent with data",
    paginatedResponse.pagination.records >= paginatedResponse.data.length,
  );
  // Test page 2 if there are enough records
  if (dateFilteredResponse.data.length > 2) {
    const page2Response =
      await api.functional.multiUserTodo.member.sessions.index(
        memberConnection,
        {
          body: {
            startDate: startDate.toISOString(),
            limit: 2,
            page: 2,
          } satisfies IMultiUserTodoMemberSession.IRequest,
        },
      );
    typia.assert(page2Response);
    TestValidator.equals(
      "page 2 current page",
      page2Response.pagination.current,
      2,
    );
    // Verify no duplicate sessions between pages
    const page1Ids = new Set(paginatedResponse.data.map((s) => s.id));
    const hasDuplicates = page2Response.data.some((s) => page1Ids.has(s.id));
    TestValidator.predicate(
      "no duplicate sessions across pages",
      !hasDuplicates,
    );
  }
  // 10. Test Status Filter (active sessions)
  const activeSessionsResponse =
    await api.functional.multiUserTodo.member.sessions.index(memberConnection, {
      body: {
        status: "active",
      } satisfies IMultiUserTodoMemberSession.IRequest,
    });
  typia.assert(activeSessionsResponse);
  // All active sessions should have expired_at in the future
  const currentTime = new Date();
  for (const session of activeSessionsResponse.data) {
    const expiredAt = new Date(session.expired_at);
    TestValidator.predicate(
      `active session ${session.id} not expired`,
      expiredAt > currentTime,
    );
  }
  // 11. Test Sorting with Filters
  const sortedByCreatedResponse =
    await api.functional.multiUserTodo.member.sessions.index(memberConnection, {
      body: {
        startDate: startDate.toISOString(),
        sortBy: "created_at",
        sortOrder: "desc",
      } satisfies IMultiUserTodoMemberSession.IRequest,
    });
  typia.assert(sortedByCreatedResponse);
  // Verify descending order by created_at
  for (let i = 1; i < sortedByCreatedResponse.data.length; i++) {
    const prevDate = new Date(sortedByCreatedResponse.data[i - 1].created_at);
    const currDate = new Date(sortedByCreatedResponse.data[i].created_at);
    TestValidator.predicate(
      `sessions sorted by created_at descending at index ${i}`,
      prevDate >= currDate,
    );
  }
}
