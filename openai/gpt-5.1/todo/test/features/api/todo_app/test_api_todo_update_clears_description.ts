import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

/**
 * Validate that updating a todo with description: null clears the description
 * while preserving other lifecycle fields and the title.
 *
 * Business workflow:
 *
 * 1. Register a member user via /auth/memberUser/join so that the SDK attaches an
 *    Authorization token to the connection.
 * 2. Create a todo for that authenticated member user with a non-null description
 *    using /todoApp/memberUser/todos (ITodoAppTodo.ICreate).
 * 3. Update the todo using /todoApp/memberUser/todos/{todoId} (PUT) with an
 *    ITodoAppTodo.IUpdate body that explicitly sets description to null and
 *    does not include title or status.
 * 4. Verify from the update response that:
 *
 *    - Title is unchanged;
 *    - Description is now null (cleared);
 *    - Updated_at has changed (advanced) compared to the original todo;
 *    - Status, completed_at, and deleted_at remain equal to their original values.
 */
export async function test_api_todo_update_clears_description(
  connection: api.IConnection,
) {
  // 1. Register a member user (join) to obtain an authenticated context.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserJoin.IRequest;

  const authorized: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2. Create a todo with non-null description.
  const createBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ITodoAppTodo.ICreate;

  const createdTodo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: createBody,
    });
  typia.assert(createdTodo);

  // Ensure preconditions: description is not null and has some content.
  TestValidator.predicate(
    "created todo description must be non-null before clearing",
    createdTodo.description !== null && createdTodo.description !== undefined,
  );

  // Take a snapshot of fields we expect to remain stable or to compare.
  const originalTitle = createdTodo.title;
  const originalStatus = createdTodo.status;
  const originalUpdatedAt = createdTodo.updated_at;
  const originalCompletedAt = createdTodo.completed_at;
  const originalDeletedAt = createdTodo.deleted_at;

  // 3. Update the todo, clearing the description by setting it explicitly to null.
  const updateBody = {
    description: null,
  } satisfies ITodoAppTodo.IUpdate;

  const updatedTodo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.update(connection, {
      todoId: createdTodo.id,
      body: updateBody,
    });
  typia.assert(updatedTodo);

  // 4. Validate business rules.
  // 4-1. Title remains unchanged.
  TestValidator.equals(
    "todo title should remain unchanged after clearing description",
    updatedTodo.title,
    originalTitle,
  );

  // 4-2. Description is now null.
  TestValidator.predicate(
    "todo description should be null after update",
    updatedTodo.description === null,
  );

  // 4-3. updated_at has advanced (is not equal to the previous value).
  TestValidator.notEquals(
    "updated_at should change after description update",
    updatedTodo.updated_at,
    originalUpdatedAt,
  );

  // 4-4. status remains the same.
  TestValidator.equals(
    "todo status should remain unchanged when only description is cleared",
    updatedTodo.status,
    originalStatus,
  );

  // 4-5. completed_at remains the same (both in value and nullability).
  TestValidator.equals(
    "completed_at should remain unchanged when only description is cleared",
    updatedTodo.completed_at,
    originalCompletedAt ?? null,
  );

  // 4-6. deleted_at remains the same (both in value and nullability).
  TestValidator.equals(
    "deleted_at should remain unchanged when only description is cleared",
    updatedTodo.deleted_at,
    originalDeletedAt ?? null,
  );
}
