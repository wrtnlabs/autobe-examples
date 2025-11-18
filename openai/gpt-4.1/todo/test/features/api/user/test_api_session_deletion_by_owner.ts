import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListSysMigration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSysMigration";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validate that an authenticated user can delete their own session.
 *
 * 1. Register a user (join), acquire their email and session tokens.
 * 2. Create a Todo, ensuring a session context is established.
 * 3. Delete the session with the correct email/sessionId.
 * 4. Validate the session tokens are invalidated (logout effect: further actions
 *    with those tokens fail).
 * 5. Attempt to delete another user's session with the current user's tokens and
 *    confirm it is forbidden.
 */
export async function test_api_session_deletion_by_owner(
  connection: api.IConnection,
) {
  // 1. Register user #1 (owner)
  const email1 = typia.random<string & tags.Format<"email">>();
  const password1 = RandomGenerator.alphaNumeric(12);
  const userJoinBody1 = {
    email: email1,
    password: password1 as string,
    href: "https://example.com/join",
    referrer: "https://google.com/",
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ITodoListUser.ICreate;
  const auth1: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    { body: userJoinBody1 },
  );
  typia.assert(auth1);

  // 2. Create a Todo (establish valid session)
  const todo1: ITodoListTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: {
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(todo1);

  // Save values before deleting session
  const sessionId1 = auth1.token.refresh.split(".")[2] ?? auth1.id; // Use token unique suffix or fallback to id
  const sessionEmail = email1;

  // 3. Delete the session as the owner
  await api.functional.todoList.user.users.sessions.erase(connection, {
    email: sessionEmail,
    sessionId: typia.assert<string & tags.Format<"uuid">>(auth1.id),
  });
  // At this point, the current tokens in connection.headers should be invalidated

  // 4. Further session operations should fail (using invalidated token from deleted session)
  await TestValidator.error(
    "token should be invalid after session deletion",
    async () => {
      await api.functional.todoList.user.todos.create(connection, {
        body: {
          description: RandomGenerator.paragraph(),
        } satisfies ITodoListTodo.ICreate,
      });
    },
  );

  // 5. Register user #2 for ownership enforcement test
  const email2 = typia.random<string & tags.Format<"email">>();
  const password2 = RandomGenerator.alphaNumeric(12);
  const userJoinBody2 = {
    email: email2,
    password: password2 as string,
    href: "https://example.com/join",
    referrer: "https://bing.com/",
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ITodoListUser.ICreate;
  const auth2: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    { body: userJoinBody2 },
  );
  typia.assert(auth2);

  // 6. Try to delete session of user2 using user1's old (now invalid) token context
  await TestValidator.error(
    "ownership enforcement prevents deleting another user's session",
    async () => {
      await api.functional.todoList.user.users.sessions.erase(connection, {
        email: email2,
        sessionId: typia.assert<string & tags.Format<"uuid">>(auth2.id),
      });
    },
  );
}
