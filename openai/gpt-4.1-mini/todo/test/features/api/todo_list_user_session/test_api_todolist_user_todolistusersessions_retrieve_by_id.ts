import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoListUser";
import type { ITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserSession";

export async function test_api_todolist_user_todolistusersessions_retrieve_by_id(
  connection: api.IConnection,
) {
  // 1. User registration and authentication
  const userCreateBody = {
    email: `user_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "StrongPass123!",
    name: RandomGenerator.name(3),
  } satisfies ITodoListTodoListUser.ICreate;

  const authorizedUser: ITodoListTodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: userCreateBody });
  typia.assert(authorizedUser);

  // 2. Retrieve a specific user session by ID
  // Use a random UUID to represent session id for this test
  const session: ITodoListUserSession =
    await api.functional.todoList.user.todoListUserSessions.at(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(session);

  // 3. Validate session properties according to schema
  TestValidator.equals(
    "session id exists",
    typeof session.id === "string",
    true,
  );
  TestValidator.predicate(
    "session id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      session.id,
    ),
  );
  TestValidator.equals(
    "session todo_list_user_id matches authorized user id",
    session.todo_list_user_id,
    authorizedUser.id,
  );
  TestValidator.predicate(
    "session href is string",
    typeof session.href === "string",
  );
  TestValidator.predicate(
    "session referrer is string",
    typeof session.referrer === "string",
  );
  TestValidator.predicate(
    "session created_at is valid date-time string",
    typeof session.created_at === "string" &&
      !isNaN(Date.parse(session.created_at)),
  );
  if (session.expired_at !== null && session.expired_at !== undefined) {
    TestValidator.predicate(
      "session expired_at is valid date-time string",
      typeof session.expired_at === "string" &&
        !isNaN(Date.parse(session.expired_at)),
    );
  }
  if (session.ip !== null && session.ip !== undefined) {
    TestValidator.predicate(
      "session ip is string",
      typeof session.ip === "string",
    );
  }
}
