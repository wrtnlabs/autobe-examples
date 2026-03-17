import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMemberSession";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test member session filtering by IP address and date range.
 *
 * This test validates that members can filter their authentication sessions
 * by IP address (partial match) and creation date range. The test:
 * 1. Registers a new member account
 * 2. Queries sessions with IP filter to verify partial matching works
 * 3. Queries sessions with date range filters (created_from/created_to)
 * 4. Validates that returned sessions match the applied filters
 * 5. Tests combined IP and date range filtering
 */
export async function test_api_member_session_filter_by_ip_and_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member and get authenticated connection
  const memberAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(memberAuth);
  // Create member-specific connection with auth token
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: memberAuth.token.access,
    },
  };
  // 2. Query all sessions to establish baseline
  const allSessions = await api.functional.todoApp.member.sessions.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies ITodoAppMemberSession.IRequest,
    },
  );
  typia.assert(allSessions);
  TestValidator.predicate("has sessions", allSessions.data.length >= 1);
  // 3. Get the first session's IP for filtering test
  const firstSession = allSessions.data[0];
  const testIp = firstSession.ip;
  // Use at least 3 characters for meaningful partial match
  const ipPartial =
    testIp.length > 6 ? testIp.substring(0, testIp.length - 3) : testIp;
  // 4. Filter sessions by IP partial match
  const ipFilteredSessions = await api.functional.todoApp.member.sessions.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 100,
        ip: ipPartial,
      } satisfies ITodoAppMemberSession.IRequest,
    },
  );
  typia.assert(ipFilteredSessions);
  // Validate all returned sessions contain the IP partial match
  for (const session of ipFilteredSessions.data) {
    TestValidator.predicate(
      `session IP contains ${ipPartial}`,
      session.ip.includes(ipPartial),
    );
  }
  // 5. Filter sessions by date range (created_from)
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneDayLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const dateFilteredSessions =
    await api.functional.todoApp.member.sessions.index(memberConnection, {
      body: {
        page: 1,
        limit: 100,
        created_from: oneDayAgo.toISOString(),
        created_to: oneDayLater.toISOString(),
      } satisfies ITodoAppMemberSession.IRequest,
    });
  typia.assert(dateFilteredSessions);
  // Validate all returned sessions fall within date range
  for (const session of dateFilteredSessions.data) {
    const createdAt = new Date(session.created_at);
    TestValidator.predicate(
      `session created_at >= ${oneDayAgo.toISOString()}`,
      createdAt >= oneDayAgo,
    );
    TestValidator.predicate(
      `session created_at <= ${oneDayLater.toISOString()}`,
      createdAt <= oneDayLater,
    );
  }
  // 6. Combined IP and date range filtering
  const combinedFilteredSessions =
    await api.functional.todoApp.member.sessions.index(memberConnection, {
      body: {
        page: 1,
        limit: 100,
        ip: ipPartial,
        created_from: oneDayAgo.toISOString(),
        created_to: oneDayLater.toISOString(),
      } satisfies ITodoAppMemberSession.IRequest,
    });
  typia.assert(combinedFilteredSessions);
  // Validate combined filter results
  for (const session of combinedFilteredSessions.data) {
    TestValidator.predicate(
      `session IP contains ${ipPartial}`,
      session.ip.includes(ipPartial),
    );
    const createdAt = new Date(session.created_at);
    TestValidator.predicate(
      `session in date range`,
      createdAt >= oneDayAgo && createdAt <= oneDayLater,
    );
  }
  // 7. Test pagination with filters
  const paginatedSessions = await api.functional.todoApp.member.sessions.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
        ip: ipPartial,
      } satisfies ITodoAppMemberSession.IRequest,
    },
  );
  typia.assert(paginatedSessions);
  TestValidator.predicate(
    "pagination data count within limit",
    paginatedSessions.data.length <= 10,
  );
  TestValidator.equals(
    "pagination current page",
    paginatedSessions.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit valid",
    paginatedSessions.pagination.limit <= 100,
  );
  // 8. Test sorting by created_at descending
  const sortedSessionsDesc = await api.functional.todoApp.member.sessions.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 100,
        sort: "created_at",
        direction: "desc",
      } satisfies ITodoAppMemberSession.IRequest,
    },
  );
  typia.assert(sortedSessionsDesc);
  // Validate descending order (newest first)
  for (let i = 1; i < sortedSessionsDesc.data.length; i++) {
    const prevDate = new Date(sortedSessionsDesc.data[i - 1].created_at);
    const currDate = new Date(sortedSessionsDesc.data[i].created_at);
    TestValidator.predicate(
      `sessions sorted desc at index ${i}`,
      prevDate >= currDate,
    );
  }
  // 9. Test sorting by created_at ascending
  const sortedSessionsAsc = await api.functional.todoApp.member.sessions.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 100,
        sort: "created_at",
        direction: "asc",
      } satisfies ITodoAppMemberSession.IRequest,
    },
  );
  typia.assert(sortedSessionsAsc);
  // Validate ascending order (oldest first)
  for (let i = 1; i < sortedSessionsAsc.data.length; i++) {
    const prevDate = new Date(sortedSessionsAsc.data[i - 1].created_at);
    const currDate = new Date(sortedSessionsAsc.data[i].created_at);
    TestValidator.predicate(
      `sessions sorted asc at index ${i}`,
      prevDate <= currDate,
    );
  }
}
