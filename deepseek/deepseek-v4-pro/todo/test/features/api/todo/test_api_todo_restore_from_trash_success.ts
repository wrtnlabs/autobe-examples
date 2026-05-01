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
 * Test successful restoration of a soft-deleted todo from trash back to the active todo list.
 *
 * Validates the complete restoration flow: member registration, todo creation with all fields populated, soft-deletion to move the todo to trash, and restoration back to active state. Ensures that after restoration, all original todo fields — title, description, start date, due date, completion status, and creation timestamp — remain fully intact.
 *
 * The test also confirms that the restored todo's updated_at timestamp is refreshed to reflect the restoration operation, and that the completed_at field remains null since the todo was never marked complete during this flow.
 *
 * 1. Member authenticates via join to obtain JWT credentials.
 * 2. Member creates a todo with title, description, start date, and due date.
 * 3. Member soft-deletes the todo, moving it to the trash.
 * 4. Member restores the todo from the trash using the restore endpoint.
 * 5. Validates that the restored todo preserves all original data fields.
 * 6. Confirms updated_at has been refreshed and completed_at remains null.
 */
export async function test_api_todo_restore_from_trash_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a todo with all fields populated
  const startDate = new Date().toISOString();
  const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const originalTodo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        start_date: startDate,
        due_date: dueDate,
      },
    },
  );
  typia.assert(originalTodo);
  // 3. Soft-delete the todo to move it to trash
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId: originalTodo.id,
  });
  // 4. Restore the todo from trash
  const restoredTodo = await api.functional.todoApp.member.todos.trash.restore(
    memberConnection,
    {
      todoId: originalTodo.id,
    },
  );
  typia.assert(restoredTodo);
  // 5. Validate data preservation
  TestValidator.equals(
    "restored todo id matches",
    restoredTodo.id,
    originalTodo.id,
  );
  TestValidator.equals(
    "title preserved after restore",
    restoredTodo.title,
    originalTodo.title,
  );
  TestValidator.equals(
    "description preserved after restore",
    restoredTodo.description,
    originalTodo.description,
  );
  TestValidator.equals(
    "start_date preserved after restore",
    restoredTodo.start_date,
    originalTodo.start_date,
  );
  TestValidator.equals(
    "due_date preserved after restore",
    restoredTodo.due_date,
    originalTodo.due_date,
  );
  TestValidator.equals(
    "completed_at still null after restore",
    restoredTodo.completed_at,
    null,
  );
  TestValidator.equals(
    "created_at preserved after restore",
    restoredTodo.created_at,
    originalTodo.created_at,
  );
  TestValidator.predicate(
    "updated_at refreshed after restore",
    () => restoredTodo.updated_at !== originalTodo.updated_at,
  );
}
