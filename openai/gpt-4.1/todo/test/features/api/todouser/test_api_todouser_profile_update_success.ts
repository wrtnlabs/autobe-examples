import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListTodouser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodouser";

/**
 * Validate that a todoUser can update their own profile (email and password).
 *
 * This test covers the journey from registration to profile update, ensuring
 * business constraints and security are correctly enforced by the API:
 *
 * 1. Register a new todoUser and validate response structure and timestamps.
 * 2. Create a todo (user dependency) so the profile update route is valid.
 * 3. Update the user's profile: change to a new unique email and a new password
 *    (minimum 8 chars).
 * 4. Confirm the response reflects changed email and that 'updated_at' is
 *    different from 'created_at'.
 * 5. Attempt to update with an email used by another user and expect business
 *    rejection.
 * 6. Ensure password change is successful and does not leak sensitive data
 *    (response never contains a password hash or plaintext).
 */
export async function test_api_todouser_profile_update_success(
  connection: api.IConnection,
) {
  // 1. Register original user
  const joinEmail: string = typia.random<string & tags.Format<"email">>();
  const joinPassword: string = typia.random<string & tags.MinLength<8>>();
  const joinHref: string = "https://app.example.com/register";
  const joinReferrer: string = "https://app.example.com/home";
  const userAuth = await api.functional.auth.todoUser.join(connection, {
    body: {
      email: joinEmail,
      password: joinPassword,
      href: joinHref,
      referrer: joinReferrer,
    } satisfies ITodoListTodouser.IVerifyJoin,
  });
  typia.assert(userAuth);

  TestValidator.equals(
    "returned email matches registration",
    userAuth.email,
    joinEmail,
  );

  // 2. Create a todo for this user (fulfilling dependency)
  const initTodo = await api.functional.todoList.todoUser.todos.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 10,
        }),
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(initTodo);
  TestValidator.equals(
    "todo owner matches joined user",
    initTodo.todo_list_todouser_id,
    userAuth.id,
  );

  // 3. Change to new unique email and new password
  const updateEmail: string = typia.random<string & tags.Format<"email">>();
  const updatePassword: string = typia.random<string & tags.MinLength<8>>();
  const userUpdateResponse =
    await api.functional.todoList.todoUser.todoUsers.update(connection, {
      todoUserId: userAuth.id,
      body: {
        email: updateEmail,
        password: updatePassword,
      } satisfies ITodoListTodouser.IUpdate,
    });
  typia.assert(userUpdateResponse);
  TestValidator.equals("email updated", userUpdateResponse.email, updateEmail);
  TestValidator.notEquals(
    "updated_at changed from created_at",
    userUpdateResponse.updated_at,
    userAuth.created_at,
  );
  TestValidator.equals(
    "user id remains the same",
    userUpdateResponse.id,
    userAuth.id,
  );
  TestValidator.notEquals(
    "updated_at has changed",
    userUpdateResponse.updated_at,
    userAuth.updated_at,
  );

  // 4. Register another user to test unique email violation logic
  const anotherEmail: string = typia.random<string & tags.Format<"email">>();
  const anotherPassword: string = typia.random<string & tags.MinLength<8>>();
  const anotherAuth = await api.functional.auth.todoUser.join(connection, {
    body: {
      email: anotherEmail,
      password: anotherPassword,
      href: joinHref,
      referrer: joinReferrer,
    } satisfies ITodoListTodouser.IVerifyJoin,
  });
  typia.assert(anotherAuth);

  // Try to update original user's email to one already used (should be rejected)
  await TestValidator.error(
    "should fail when updating to existing email",
    async () => {
      await api.functional.todoList.todoUser.todoUsers.update(connection, {
        todoUserId: userAuth.id,
        body: {
          email: anotherEmail,
        } satisfies ITodoListTodouser.IUpdate,
      });
    },
  );

  // 5. Ensure response never leaks password or hash fields
  TestValidator.predicate(
    "no password property leaks to client on update",
    !("password" in userUpdateResponse),
  );
  TestValidator.predicate(
    "no password_hash property leaks to client on update",
    !("password_hash" in userUpdateResponse),
  );
}
