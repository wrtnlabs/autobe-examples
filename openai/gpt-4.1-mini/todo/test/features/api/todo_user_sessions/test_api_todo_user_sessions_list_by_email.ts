import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoUserSession";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import type { ITodoUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUserSession";

export async function test_api_todo_user_sessions_list_by_email(
  connection: api.IConnection,
) {
  // 1. User registration
  const userEmail = `${RandomGenerator.name(1)}.${RandomGenerator.name(1)}@example.com`;
  const userAuthorized: ITodoUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: "Passw0rd!",
      } satisfies ITodoUser.ICreate,
    });
  typia.assert(userAuthorized);

  // 2. Create todo user account
  const todoUser: ITodoUser = await api.functional.todo.todoUsers.create(
    connection,
    {
      body: {
        email: userEmail,
        password: "Passw0rd!",
      } satisfies ITodoUser.ICreate,
    },
  );
  typia.assert(todoUser);

  // 3. Create multiple todo user sessions
  const sessionCount = 5;
  for (let i = 0; i < sessionCount; ++i) {
    const sessionBody = {
      ip: `192.168.1.${i + 1}`,
      href: `https://example.com/path${i}`,
      referrer: `https://referrer.com/page${i}`,
    } satisfies ITodoUserSession.ICreate;

    const createdSession: ITodoUserSession =
      await api.functional.todo.user.todoUsers.sessions.create(connection, {
        todoUserEmail: todoUser.email,
        body: sessionBody,
      });
    typia.assert(createdSession);
  }

  // 4. Request session list with pagination and filtering
  const searchRequest = {
    page: 1,
    limit: 10,
    sortBy: "created_at",
    sortOrder: "desc",
  } satisfies ITodoUserSession.IRequest;

  const sessionPage: IPageITodoUserSession.ISummary =
    await api.functional.todo.user.todoUsers.sessions.index(connection, {
      todoUserEmail: todoUser.email,
      body: searchRequest,
    });
  typia.assert(sessionPage);

  // 5. Validation
  TestValidator.equals(
    "pagination current page is 1",
    sessionPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 10",
    sessionPage.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records count non-negative",
    sessionPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count positive",
    sessionPage.pagination.pages > 0,
  );

  // All listed sessions belong to the todoUser
  for (const session of sessionPage.data) {
    TestValidator.equals(
      "session todo_user_id should match user id",
      session.todo_user_id,
      todoUser.id,
    );
  }

  // Sorted descending by created_at
  for (let i = 1; i < sessionPage.data.length; ++i) {
    TestValidator.predicate(
      "sessions sorted by created_at desc",
      sessionPage.data[i - 1].created_at >= sessionPage.data[i].created_at,
    );
  }
}
