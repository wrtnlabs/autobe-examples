import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

/**
 * Verify that the owning member user can update the basic content fields of an
 * existing todo.
 *
 * Business workflow:
 *
 * 1. Register a new member user with POST /auth/memberUser/join to obtain an
 *    authenticated context.
 * 2. Using that context, create an initial todo with POST
 *    /todoApp/memberUser/todos, giving it a title and no description.
 * 3. Call PUT /todoApp/memberUser/todos/{todoId} with an ITodoAppTodo.IUpdate body
 *    that changes the title and adds a description.
 * 4. Assert that the response is a valid ITodoAppTodo.
 * 5. Validate business invariants:
 *
 *    - Id and memberUser are unchanged.
 *    - Title and description match the update payload.
 *    - Updated_at is later than the previous updated_at.
 *    - Status, completed_at, and deleted_at remain equal to their previous values.
 */
export async function test_api_todo_update_basic_fields_by_owner(
  connection: api.IConnection,
) {
  // 1. Register a new member user (join) to establish authenticated context
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

  // 2. Create an initial todo with a title and no description
  const createBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: null,
  } satisfies ITodoAppTodo.ICreate;

  const created: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: createBody,
    });
  typia.assert(created);

  // Guard that description is currently null and status lifecycle baseline is captured
  TestValidator.equals(
    "initial description should be null",
    created.description ?? null,
    null,
  );

  const previousStatus = created.status;
  const previousCompletedAt = created.completed_at ?? null;
  const previousDeletedAt = created.deleted_at ?? null;
  const previousUpdatedAt = created.updated_at;

  // 3. Update the todo's title and description using PUT /todoApp/memberUser/todos/{todoId}
  const newTitle = RandomGenerator.paragraph({ sentences: 2 });
  const newDescription = RandomGenerator.paragraph({ sentences: 4 });

  const updateBody = {
    title: newTitle,
    description: newDescription,
  } satisfies ITodoAppTodo.IUpdate;

  const updated: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.update(connection, {
      todoId: created.id,
      body: updateBody,
    });
  typia.assert(updated);

  // 4. Validate identity and ownership invariants
  TestValidator.equals(
    "todo id must remain unchanged after update",
    updated.id,
    created.id,
  );

  TestValidator.equals(
    "owning memberUser must remain unchanged after update",
    updated.memberUser,
    created.memberUser,
  );

  // 5. Validate content updates
  TestValidator.equals(
    "title should be updated to the new value",
    updated.title,
    newTitle,
  );

  TestValidator.equals(
    "description should be updated to the new non-null value",
    updated.description ?? null,
    newDescription,
  );

  // 6. Validate updated_at has advanced
  const initialUpdatedAt = new Date(previousUpdatedAt).getTime();
  const updatedUpdatedAt = new Date(updated.updated_at).getTime();

  TestValidator.predicate(
    "updated_at must be later than previous updated_at",
    updatedUpdatedAt > initialUpdatedAt,
  );

  // 7. Lifecycle fields should remain unchanged for this basic content update
  TestValidator.equals(
    "status should remain unchanged when only basic fields are updated",
    updated.status,
    previousStatus,
  );

  TestValidator.equals(
    "completed_at should remain unchanged when only basic fields are updated",
    updated.completed_at ?? null,
    previousCompletedAt,
  );

  TestValidator.equals(
    "deleted_at should remain unchanged when only basic fields are updated",
    updated.deleted_at ?? null,
    previousDeletedAt,
  );
}
