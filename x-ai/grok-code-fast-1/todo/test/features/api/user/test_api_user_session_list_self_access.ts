import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListUserSession";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import type { ITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserSession";

/**
 * Validate that a user can retrieve their own authentication session list, test
 * filtering, pagination, status, date, and text search, and verify isolation by
 * actor.
 */
export async function test_api_user_session_list_self_access(
  connection: api.IConnection,
) {
  // 1. Register user1 and obtain authentication context
  const user1JoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    display_name: RandomGenerator.name(),
    href: "https://app.todolist.local/register",
    referrer: "https://app.todolist.local/welcome",
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ITodoListUser.IJoin;
  const user1Auth = await api.functional.auth.user.join(connection, {
    body: user1JoinBody,
  });
  typia.assert(user1Auth);
  const user1Id = user1Auth.id;

  // 2. Register user2 for cross-user access test
  const user2JoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    display_name: RandomGenerator.name(),
    href: "https://app.todolist.local/register",
    referrer: "https://app.todolist.local/welcome",
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ITodoListUser.IJoin;
  const user2Auth = await api.functional.auth.user.join(connection, {
    body: user2JoinBody,
  });
  typia.assert(user2Auth);
  const user2Id = user2Auth.id;

  // 3. Retrieve user1 session list with default pagination
  const basePageReq = {
    page: 1,
    limit: 10,
  } satisfies ITodoListUserSession.IRequest;
  const user1Sessions = await api.functional.todoList.user.users.sessions.index(
    connection,
    {
      userId: user1Id,
      body: basePageReq,
    },
  );
  typia.assert(user1Sessions);
  TestValidator.equals(
    "user1 returned sessions belong to user1",
    user1Sessions.data.every((s) => s.todo_list_user_id === user1Id),
    true,
  );

  // 4. Filtering by status: show active and expired sessions (all possible values)
  const allStatuses = [undefined, "active", "expired"] as const;
  for (const status of allStatuses) {
    const req = {
      ...basePageReq,
      status,
    } satisfies ITodoListUserSession.IRequest;
    const filtered = await api.functional.todoList.user.users.sessions.index(
      connection,
      {
        userId: user1Id,
        body: req,
      },
    );
    typia.assert(filtered);
    TestValidator.equals(
      "filtered user1 sessions belong to user1",
      filtered.data.every((s) => s.todo_list_user_id === user1Id),
      true,
    );
    if (status) {
      const allMatch = filtered.data.every((s) =>
        status === "active"
          ? !s.expired_at
          : s.expired_at !== null && s.expired_at !== undefined,
      );
      TestValidator.equals(
        `all user1 session status are ${status}`,
        allMatch,
        true,
      );
    }
  }

  // 5. Filtering by creation date
  const nowIso = new Date().toISOString();
  const dateReq = {
    ...basePageReq,
    from: nowIso,
    to: nowIso,
  } satisfies ITodoListUserSession.IRequest;
  const dateFiltered = await api.functional.todoList.user.users.sessions.index(
    connection,
    {
      userId: user1Id,
      body: dateReq,
    },
  );
  typia.assert(dateFiltered);
  TestValidator.equals(
    "user1 session date filter matches",
    dateFiltered.data.every((s) => s.todo_list_user_id === user1Id),
    true,
  );

  // 6. Filtering by text search
  if (user1Sessions.data.length > 0) {
    const searchIp = user1Sessions.data[0].ip;
    const searchReq = {
      ...basePageReq,
      search: searchIp,
    } satisfies ITodoListUserSession.IRequest;
    const searchResult =
      await api.functional.todoList.user.users.sessions.index(connection, {
        userId: user1Id,
        body: searchReq,
      });
    typia.assert(searchResult);
    TestValidator.equals(
      "user1 session text search matches",
      searchResult.data.every((s) => s.todo_list_user_id === user1Id),
      true,
    );
    if (searchResult.data.length > 0) {
      TestValidator.equals(
        "text search result contains ip",
        searchResult.data.some((s) => s.ip === searchIp),
        true,
      );
    }
  }

  // 7. Pagination: request a different page size (smaller limit)
  const pagedReq = {
    ...basePageReq,
    page: 1,
    limit: 1,
  } satisfies ITodoListUserSession.IRequest;
  const pagedResult = await api.functional.todoList.user.users.sessions.index(
    connection,
    {
      userId: user1Id,
      body: pagedReq,
    },
  );
  typia.assert(pagedResult);
  TestValidator.equals(
    "pagination works for user1",
    pagedResult.pagination.limit,
    1,
  );

  // 8. Attempt user2 to access user1's sessions, should fail
  await api.functional.auth.user.join(connection, { body: user2JoinBody }); // Issue token for user2
  await TestValidator.error(
    "user2 cannot access user1's sessions",
    async () => {
      await api.functional.todoList.user.users.sessions.index(connection, {
        userId: user1Id,
        body: basePageReq,
      });
    },
  );
}
