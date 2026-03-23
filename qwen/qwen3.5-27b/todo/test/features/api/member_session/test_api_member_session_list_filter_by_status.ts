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

export async function test_api_member_session_list_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test that a member can filter their authentication sessions by status (active or expired).
   * 1. Register a new member account
   * 2. Login multiple times to create multiple active sessions
   * 3. Filter sessions by "active" status and verify all are active
   * 4. Filter sessions by "expired" status and verify empty results (no expired sessions exist)
   * 5. Validate pagination metadata
   */
  // Store credentials before registration
  const testEmail = typia.random<string & tags.Format<"email">>();
  const testPassword = typia.random<string & tags.Format<"password">>();
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_member_join(memberConnection, {
    body: {
      email: testEmail,
      password: testPassword,
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(joinResponse);
  // 2. Login again to create second session (first session created during join)
  const memberConnection2: api.IConnection = { host: connection.host };
  await authorize_member_login(memberConnection2, {
    body: {
      email: testEmail,
      password: testPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMultiUserTodoMember.ILogin,
  });
  // Login again to create third session
  const memberConnection3: api.IConnection = { host: connection.host };
  await authorize_member_login(memberConnection3, {
    body: {
      email: testEmail,
      password: testPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMultiUserTodoMember.ILogin,
  });
  // 3. Test filtering by "active" status using the last authenticated connection
  const activeSessionsResponse =
    await api.functional.multiUserTodo.member.sessions.index(
      memberConnection3,
      {
        body: {
          status: "active",
        } satisfies IMultiUserTodoMemberSession.IRequest,
      },
    );
  typia.assert(activeSessionsResponse);
  // Verify all returned sessions are active (expired_at > current time)
  const currentTime = new Date();
  for (const session of activeSessionsResponse.data) {
    const expiredAt = new Date(session.expired_at);
    TestValidator.predicate(
      `session ${session.id} should be active (expired_at > now)`,
      expiredAt > currentTime,
    );
  }
  // Verify we have multiple active sessions (at least 2: one from join, two from logins)
  TestValidator.predicate(
    "should have multiple active sessions",
    activeSessionsResponse.data.length >= 2,
  );
  // Verify pagination metadata
  TestValidator.equals(
    "active sessions pagination current page",
    activeSessionsResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "active sessions pagination has records",
    activeSessionsResponse.pagination.records > 0,
  );
  TestValidator.equals(
    "active sessions count matches pagination",
    activeSessionsResponse.data.length,
    activeSessionsResponse.pagination.records,
  );
  // 4. Test filtering by "expired" status (should return empty since no expired sessions exist)
  const expiredSessionsResponse =
    await api.functional.multiUserTodo.member.sessions.index(
      memberConnection3,
      {
        body: {
          status: "expired",
        } satisfies IMultiUserTodoMemberSession.IRequest,
      },
    );
  typia.assert(expiredSessionsResponse);
  // Verify no expired sessions (since we just created them)
  TestValidator.equals(
    "should have no expired sessions",
    expiredSessionsResponse.data.length,
    0,
  );
  TestValidator.equals(
    "expired sessions pagination records",
    expiredSessionsResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "expired sessions pagination pages",
    expiredSessionsResponse.pagination.pages,
    0,
  );
  // 5. Test pagination with active filter
  const paginatedActiveResponse =
    await api.functional.multiUserTodo.member.sessions.index(
      memberConnection3,
      {
        body: {
          status: "active",
          page: 1,
          limit: 2,
        } satisfies IMultiUserTodoMemberSession.IRequest,
      },
    );
  typia.assert(paginatedActiveResponse);
  // Verify pagination works correctly
  TestValidator.equals(
    "paginated limit",
    paginatedActiveResponse.pagination.limit,
    2,
  );
  TestValidator.equals(
    "paginated current page",
    paginatedActiveResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "paginated data respects limit",
    paginatedActiveResponse.data.length <= 2,
  );
  TestValidator.predicate(
    "paginated total records unchanged",
    paginatedActiveResponse.pagination.records ===
      activeSessionsResponse.pagination.records,
  );
}
