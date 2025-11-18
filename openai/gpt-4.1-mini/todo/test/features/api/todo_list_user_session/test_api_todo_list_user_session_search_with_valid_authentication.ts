import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListUserSession";
import type { ITodoListTodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoListUser";
import type { ITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserSession";

export async function test_api_todo_list_user_session_search_with_valid_authentication(
  connection: api.IConnection,
) {
  // 1. Join a new user and obtain authorization
  const user: ITodoListTodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
        name: RandomGenerator.name(),
      } satisfies ITodoListTodoListUser.ICreate,
    });
  typia.assert(user);

  // 2. Create a new user session linked with the newly joined user
  const sessionBody: ITodoListUserSession.ICreate = {
    ip: "192.168.1.1",
    href: "https://example.com/todo",
    referrer: "https://example.com",
    expired_at: null,
  };
  const session: ITodoListUserSession =
    await api.functional.todoList.user.todoListUsers.todoListUserSessions.create(
      connection,
      {
        todoListUserId: user.id,
        body: sessionBody,
      },
    );
  typia.assert(session);

  // 3. Retrieve the user session list with filter and pagination
  const requestBody: ITodoListUserSession.IRequest = {
    page: 1,
    limit: 10,
    search: "192.168",
    sortBy: "created_at",
    sortOrder: "desc",
  };
  const pageResult: IPageITodoListUserSession.ISummary =
    await api.functional.todoList.user.todoListUsers.todoListUserSessions.index(
      connection,
      {
        todoListUserId: user.id,
        body: requestBody,
      },
    );
  typia.assert(pageResult);

  // 4. Validations
  TestValidator.predicate(
    "pagination current page is 1",
    pageResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 10",
    pageResult.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination records count is not negative",
    pageResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is not negative",
    pageResult.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "session data is an array",
    Array.isArray(pageResult.data),
  );

  const foundSession = pageResult.data.find((s) => s.id === session.id);
  TestValidator.predicate(
    "created session exists in search results",
    foundSession !== undefined,
  );
  if (foundSession !== undefined) {
    TestValidator.equals("session IP matches", foundSession.ip, sessionBody.ip);
    TestValidator.equals(
      "session href matches",
      foundSession.href,
      sessionBody.href,
    );
    TestValidator.equals(
      "session referrer matches",
      foundSession.referrer,
      sessionBody.referrer,
    );
    TestValidator.equals(
      "session expired_at is null",
      foundSession.expired_at,
      null,
    );
  }
}
