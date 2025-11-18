import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoListUser";
import type { ITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserSession";

export async function test_api_todo_list_user_session_update_by_owner(
  connection: api.IConnection,
) {
  // 1. User joins (registers) to create an authenticated user
  const userCreateBody = {
    email: `${RandomGenerator.name(1).toLowerCase()}${RandomGenerator.alphaNumeric(3)}@example.com`,
    name: RandomGenerator.name(),
  } satisfies ITodoListTodoListUser.ICreate;
  const authorizedUser: ITodoListTodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userCreateBody,
    });
  typia.assert(authorizedUser);

  // 2. Create a new user session for this user
  const sessionCreateBody = {
    ip: `${typia.random<number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<255>>()}.
${typia.random<number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<255>>()}.
${typia.random<number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<255>>()}.
${typia.random<number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<255>>()}`,
    href: `https://${RandomGenerator.name(1)}.example.com/path`,
    referrer: `https://referrer.example.com/${RandomGenerator.alphaNumeric(5)}`,
    expired_at: null,
  } satisfies ITodoListUserSession.ICreate;
  const session: ITodoListUserSession =
    await api.functional.todoList.user.todoListUsers.todoListUserSessions.create(
      connection,
      {
        todoListUserId: authorizedUser.id,
        body: sessionCreateBody,
      },
    );
  typia.assert(session);

  // 3. Update session connection metadata
  const updatedSessionBody = {
    ip: `${typia.random<number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<255>>()}.
${typia.random<number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<255>>()}.
${typia.random<number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<255>>()}.
${typia.random<number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<255>>()}`,
    href: `https://updated.${RandomGenerator.name(1)}.example.com/updatedpath`,
    referrer: `https://updates_referrer.example.com/${RandomGenerator.alphaNumeric(7)}`,
    expired_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  } satisfies ITodoListUserSession.IUpdate;

  const updatedSession: ITodoListUserSession =
    await api.functional.todoList.user.todoListUsers.todoListUserSessions.update(
      connection,
      {
        todoListUserId: authorizedUser.id,
        id: session.id,
        body: updatedSessionBody,
      },
    );
  typia.assert(updatedSession);

  // 4. Confirm the updated fields match what was sent
  TestValidator.equals(
    "IP address should be updated",
    updatedSession.ip,
    updatedSessionBody.ip,
  );
  TestValidator.equals(
    "Href should be updated",
    updatedSession.href,
    updatedSessionBody.href,
  );
  TestValidator.equals(
    "Referrer should be updated",
    updatedSession.referrer,
    updatedSessionBody.referrer,
  );
  TestValidator.equals(
    "Expired_at should be updated",
    updatedSession.expired_at,
    updatedSessionBody.expired_at,
  );
}
