import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoListUser";
import type { ITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserSession";

export async function test_api_todo_list_user_session_update_by_authenticated_user(
  connection: api.IConnection,
) {
  // 1. Create new user account for authentication
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password = "validpassword";
  const name = RandomGenerator.name();

  const joinBody = {
    email: email,
    password: password,
    name: name,
  } satisfies ITodoListTodoListUser.ICreate;

  const authorizedUser: ITodoListTodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: joinBody,
    });
  typia.assert(authorizedUser);

  // 2. Create new todo list user session
  const createSessionBody = {
    ip: "192.168.1.1",
    href: "https://example.com/todolist",
    referrer: "https://referrer.com",
    expired_at: new Date(Date.now() + 3600 * 1000).toISOString(), // 1 hour later
  } satisfies ITodoListUserSession.ICreate;

  const createdSession: ITodoListUserSession =
    await api.functional.todoList.user.todoListUserSessions.create(connection, {
      body: createSessionBody,
    });
  typia.assert(createdSession);

  // 3. Update the todo list user session
  const updateSessionBody = {
    ip: "10.0.0.2",
    href: "https://example.com/todolist/updated",
    referrer: "https://referrer-updated.com",
    expired_at: new Date(Date.now() + 7200 * 1000).toISOString(), // 2 hours later
  } satisfies ITodoListUserSession.IUpdate;

  const updatedSession: ITodoListUserSession =
    await api.functional.todoList.user.todoListUserSessions.update(connection, {
      id: createdSession.id,
      body: updateSessionBody,
    });
  typia.assert(updatedSession);

  // 4. Validate updated properties
  TestValidator.equals(
    "Session ID must remain the same",
    updatedSession.id,
    createdSession.id,
  );
  TestValidator.equals(
    "Updated IP should match",
    updatedSession.ip,
    updateSessionBody.ip,
  );
  TestValidator.equals(
    "Updated href should match",
    updatedSession.href,
    updateSessionBody.href,
  );
  TestValidator.equals(
    "Updated referrer should match",
    updatedSession.referrer,
    updateSessionBody.referrer,
  );
  TestValidator.equals(
    "Updated expired_at should match",
    updatedSession.expired_at,
    updateSessionBody.expired_at,
  );
}
