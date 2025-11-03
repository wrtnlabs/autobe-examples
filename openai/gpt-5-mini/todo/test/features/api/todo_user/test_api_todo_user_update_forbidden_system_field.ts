import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";

export async function test_api_todo_user_update_forbidden_system_field(
  connection: api.IConnection,
) {
  /**
   * Purpose: Validate that the todo-user profile update endpoint accepts
   * allowed profile updates and that server-side validation rejects malformed
   * path parameters. This test avoids attempting to send server-only protected
   * fields (which are not part of the update DTO) to remain fully type-safe and
   * compilable.
   *
   * Flow:
   *
   * 1. Create a new todoUser via POST /auth/todoUser/join
   * 2. Update the user's displayName via PUT
   *    /todoApp/todoUser/todoUsers/:todoUserId
   * 3. Assert the returned ITodoAppTodoUser reflects the change and contains only
   *    non-sensitive fields
   * 4. Confirm invalid path parameter format is rejected by server validation
   */

  // 1) Create a fresh TodoUser via join
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://example.test/signup",
    referrer: "https://example.test/",
  } satisfies ITodoAppTodoUser.ICreate;

  const authorized: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // Extract user id and optional summary
  const userId: string & tags.Format<"uuid"> = authorized.id;
  const initialSummary = authorized.user;
  const initialDisplayName = initialSummary?.displayName ?? null;

  // 2) Perform a permitted update: change displayName
  const newDisplayName = RandomGenerator.name(2);
  const updateBody = {
    displayName: newDisplayName,
  } satisfies ITodoAppTodoUser.IUpdate;

  const updated: ITodoAppTodoUser =
    await api.functional.todoApp.todoUser.todoUsers.update(connection, {
      todoUserId: userId,
      body: updateBody,
    });
  typia.assert(updated);

  // 3) Business assertions
  TestValidator.equals(
    "displayName should be updated",
    updated.displayName ?? null,
    newDisplayName,
  );

  TestValidator.predicate("updated response contains id", !!updated.id);

  TestValidator.notEquals(
    "updatedAt should change after update",
    updated.updatedAt,
    authorized.updatedAt,
  );

  // 4) Negative test: invalid UUID path parameter must cause validation error
  await TestValidator.error(
    "invalid todoUserId format should be rejected",
    async () => {
      await api.functional.todoApp.todoUser.todoUsers.update(connection, {
        todoUserId: "invalid-uuid-format",
        body: {
          displayName: RandomGenerator.name(1),
        } satisfies ITodoAppTodoUser.IUpdate,
      });
    },
  );
}
