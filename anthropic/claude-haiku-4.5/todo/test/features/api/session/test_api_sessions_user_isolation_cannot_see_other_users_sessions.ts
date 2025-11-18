import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListSession";
import type { ITodoListSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSession";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_sessions_user_isolation_cannot_see_other_users_sessions(
  connection: api.IConnection,
) {
  // Step 1: Register user A and get authenticated connection
  const userAEmail = typia.random<string & tags.Format<"email">>();
  const userAConnection: api.IConnection = { ...connection };
  const userA: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    userAConnection,
    {
      body: {
        email: userAEmail,
        password: "Password123",
        ip: "192.168.1.1",
        href: "http://localhost:3000/register",
        referrer: "http://localhost:3000",
        user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(userA);

  // Step 2: Register user B and get authenticated connection
  const userBEmail = typia.random<string & tags.Format<"email">>();
  const userBConnection: api.IConnection = { ...connection };
  const userB: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    userBConnection,
    {
      body: {
        email: userBEmail,
        password: "Password123",
        ip: "192.168.1.2",
        href: "http://localhost:3000/register",
        referrer: "http://localhost:3000",
        user_agent: "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)",
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(userB);

  // Step 3: Retrieve sessions as user A
  const userASessionsResponse: IPageITodoListSession.ISummary =
    await api.functional.todoList.user.auth.user.sessions.index(
      userAConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies ITodoListSession.IRequest,
      },
    );
  typia.assert(userASessionsResponse);

  // Step 4: Verify user A can only see their own sessions
  TestValidator.predicate(
    "user A sessions should contain at least one session",
    userASessionsResponse.data.length > 0,
  );

  for (const session of userASessionsResponse.data) {
    TestValidator.equals(
      "session user_id matches user A's id",
      session.todo_list_user_id,
      userA.id,
    );
  }

  // Step 5: Retrieve sessions as user B
  const userBSessionsResponse: IPageITodoListSession.ISummary =
    await api.functional.todoList.user.auth.user.sessions.index(
      userBConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies ITodoListSession.IRequest,
      },
    );
  typia.assert(userBSessionsResponse);

  // Step 6: Verify user B can only see their own sessions
  TestValidator.predicate(
    "user B sessions should contain at least one session",
    userBSessionsResponse.data.length > 0,
  );

  for (const session of userBSessionsResponse.data) {
    TestValidator.equals(
      "session user_id matches user B's id",
      session.todo_list_user_id,
      userB.id,
    );
  }

  // Step 7: Verify no cross-user session visibility
  const userASessionIds = new Set(userASessionsResponse.data.map((s) => s.id));
  const userBSessionIds = new Set(userBSessionsResponse.data.map((s) => s.id));

  TestValidator.predicate(
    "user A and user B should have no overlapping sessions",
    Array.from(userASessionIds).every((id) => !userBSessionIds.has(id)),
  );
}
