import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_todo_app_member_todos_create } from "../../../generate/generate_random_todo_app_member_todos_create";
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";

/**
 * Test restoring a soft-deleted todo from trash back to active list.
 *
 * **Test Flow:**
 * 1. Register and authenticate as a new member
 * 2. Create a todo with title, description, start_date, and due_date
 * 3. Soft delete the todo (moves to trash, sets deleted_at timestamp)
 * 4. Restore the todo via PUT /todoApp/member/todos/{todoId}/restore
 * 5. Verify deleted_at is NULL after restoration
 * 6. Verify all original fields are preserved
 * 7. Verify updated_at timestamp is refreshed
 */
export async function test_api_todo_restore_from_trash(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(authResult);
  // 2. Create a todo with all fields
  const todoCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    start_date: new Date().toISOString(),
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  } satisfies ITodoAppTodo.ICreate;
  const createdTodo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    { body: todoCreateBody },
  );
  typia.assert(createdTodo);
  // Verify initial state - todo is active (deleted_at is null)
  TestValidator.equals(
    "initial deleted_at is null",
    createdTodo.deleted_at,
    null,
  );
  TestValidator.equals(
    "title matches",
    createdTodo.title,
    todoCreateBody.title,
  );
  TestValidator.equals(
    "description matches",
    createdTodo.description,
    todoCreateBody.description,
  );
  TestValidator.equals(
    "start_date matches",
    createdTodo.start_date,
    todoCreateBody.start_date,
  );
  TestValidator.equals(
    "due_date matches",
    createdTodo.due_date,
    todoCreateBody.due_date,
  );
  TestValidator.equals("completed is false", createdTodo.completed, false);
  const originalUpdatedAt = createdTodo.updated_at;
  // 3. Soft delete the todo (moves to trash)
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId: createdTodo.id,
  });
  // 4. Restore the todo from trash
  const restoredTodo = await api.functional.todoApp.member.todos.restore(
    memberConnection,
    {
      todoId: createdTodo.id,
    },
  );
  typia.assert(restoredTodo);
  // 5. Verify deleted_at is NULL after restoration
  TestValidator.equals(
    "restored deleted_at is null",
    restoredTodo.deleted_at,
    null,
  );
  // 6. Verify all original fields are preserved
  TestValidator.equals(
    "title preserved",
    restoredTodo.title,
    createdTodo.title,
  );
  TestValidator.equals(
    "description preserved",
    restoredTodo.description,
    createdTodo.description,
  );
  TestValidator.equals(
    "start_date preserved",
    restoredTodo.start_date,
    createdTodo.start_date,
  );
  TestValidator.equals(
    "due_date preserved",
    restoredTodo.due_date,
    createdTodo.due_date,
  );
  TestValidator.equals(
    "completed status preserved",
    restoredTodo.completed,
    createdTodo.completed,
  );
  // 7. Verify updated_at timestamp is refreshed after restore
  TestValidator.notEquals(
    "updated_at refreshed",
    restoredTodo.updated_at,
    originalUpdatedAt,
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      restoredTodo.updated_at,
    ),
  );
  // 8. Verify member information is preserved
  TestValidator.equals(
    "member id matches",
    restoredTodo.member.id,
    authResult.id,
  );
  TestValidator.equals(
    "member display_name matches",
    restoredTodo.member.display_name,
    authResult.display_name,
  );
}
