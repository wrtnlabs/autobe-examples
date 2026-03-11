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

export async function test_api_member_session_browsing_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  // Test 1: Get all sessions without filters
  const allSessions =
    await api.functional.multiUserTodo.member.members.sessions.index(
      memberConnection,
      {
        body: {} satisfies IMultiUserTodoMemberSession.IRequest,
      },
    );
  typia.assert(allSessions);
  // Test 2: Filter by date range
  const now = new Date().toISOString();
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const dateFilteredSessions =
    await api.functional.multiUserTodo.member.members.sessions.index(
      memberConnection,
      {
        body: {
          created_after: oneDayAgo,
          created_before: now,
        } satisfies IMultiUserTodoMemberSession.IRequest,
      },
    );
  typia.assert(dateFilteredSessions);
  // Test 3: Filter by IP address
  const ipFilteredSessions =
    await api.functional.multiUserTodo.member.members.sessions.index(
      memberConnection,
      {
        body: {
          ip: "192.168.1.1",
        } satisfies IMultiUserTodoMemberSession.IRequest,
      },
    );
  typia.assert(ipFilteredSessions);
  // Test 4: Test pagination
  const paginatedSessions =
    await api.functional.multiUserTodo.member.members.sessions.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies IMultiUserTodoMemberSession.IRequest,
      },
    );
  typia.assert(paginatedSessions);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    paginatedSessions.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit valid",
    paginatedSessions.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "total records non-negative",
    paginatedSessions.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages non-negative",
    paginatedSessions.pagination.pages >= 0,
  );
  // Test 5: Empty result set with future date
  const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const futureSessions =
    await api.functional.multiUserTodo.member.members.sessions.index(
      memberConnection,
      {
        body: {
          created_after: futureDate,
        } satisfies IMultiUserTodoMemberSession.IRequest,
      },
    );
  typia.assert(futureSessions);
  TestValidator.equals(
    "future date returns empty",
    futureSessions.data.length,
    0,
  );
  // Test 6: Combined filters
  const combinedFilterSessions =
    await api.functional.multiUserTodo.member.members.sessions.index(
      memberConnection,
      {
        body: {
          created_after: oneDayAgo,
          ip: "192.168.1.1/24",
          page: 1,
          limit: 10,
        } satisfies IMultiUserTodoMemberSession.IRequest,
      },
    );
  typia.assert(combinedFilterSessions);
  // Validate session data structure
  if (allSessions.data.length > 0) {
    const session = allSessions.data[0];
    TestValidator.predicate("session has id", session.id.length > 0);
    TestValidator.predicate(
      "session has creation date",
      session.created_at.length > 0,
    );
    TestValidator.predicate(
      "session has expiration date",
      session.expired_at.length > 0,
    );
    TestValidator.predicate("session has IP address", session.ip.length > 0);
    TestValidator.predicate("session has href", session.href.length > 0);
    TestValidator.predicate(
      "session has referrer",
      session.referrer.length > 0,
    );
  }
}
