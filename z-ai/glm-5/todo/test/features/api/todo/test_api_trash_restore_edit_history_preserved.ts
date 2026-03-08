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

export async function test_api_trash_restore_edit_history_preserved(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new member and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // Step 2: Create a todo with initial title
  const initialTitle = RandomGenerator.paragraph({ sentences: 2 });
  const initialDescription = RandomGenerator.content({ paragraphs: 2 });
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: initialTitle,
        description: initialDescription,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  const todoId = todo.id;
  // Store initial values for comparison
  const originalCreatedAt = todo.createdAt;
  // Step 3: Edit the todo multiple times to create edit history entries
  const edit1Title = RandomGenerator.paragraph({ sentences: 1 });
  const edit1Description = RandomGenerator.content({ paragraphs: 1 });
  const edited1 = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId,
      body: {
        title: edit1Title,
        description: edit1Description,
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(edited1);
  // Second edit
  const edit2Title = RandomGenerator.paragraph({ sentences: 1 });
  const edit2Description = RandomGenerator.content({ paragraphs: 1 });
  const edited2 = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId,
      body: {
        title: edit2Title,
        description: edit2Description,
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(edited2);
  // Store the last edit state for comparison after restore
  const lastEditedTitle = edited2.title;
  const lastEditedDescription = edited2.description;
  const lastEditedCompleted = edited2.completed;
  // Step 4: Delete the todo (move to trash)
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId,
  });
  // Step 5: Restore the todo from trash
  const restored = await api.functional.todoApp.member.trash.restore(
    memberConnection,
    { todoId },
  );
  typia.assert(restored);
  // Step 6: Verify all properties are preserved after restore
  TestValidator.equals("todo id preserved", restored.id, todoId);
  TestValidator.equals(
    "title preserved after restore",
    restored.title,
    lastEditedTitle,
  );
  TestValidator.equals(
    "description preserved after restore",
    restored.description,
    lastEditedDescription,
  );
  TestValidator.equals(
    "completed status preserved",
    restored.completed,
    lastEditedCompleted,
  );
  TestValidator.equals(
    "createdAt preserved",
    restored.createdAt,
    originalCreatedAt,
  );
  TestValidator.predicate(
    "deletedAt is null after restore",
    restored.deletedAt === null,
  );
  // Verify the todo is now active (not in trash)
  TestValidator.predicate("todo is active again", restored.deletedAt === null);
}
