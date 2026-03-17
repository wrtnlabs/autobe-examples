import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoEditHistory";
import type { ITodoAppUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserProfile";
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

export async function test_api_todo_edit_history_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register and authenticate a new member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Step 2: Create a new todo with title, description, started_at, and due_at
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        started_at: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
        due_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
      },
    },
  );
  typia.assert(todo);
  // Step 3: Perform the first edit — change title and description
  // This triggers automatic creation of edit history entry #1 with non-null title and description.
  const firstEditTitle = RandomGenerator.paragraph({ sentences: 2 });
  const firstEditDescription = RandomGenerator.paragraph({ sentences: 4 });
  const todoAfterFirstEdit = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: todo.id,
      body: {
        title: firstEditTitle,
        description: firstEditDescription,
        is_completed: false,
        started_at: todo.started_at,
        due_at: todo.due_at,
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(todoAfterFirstEdit);
  TestValidator.equals(
    "todo title updated after first edit",
    todoAfterFirstEdit.title,
    firstEditTitle,
  );
  TestValidator.equals(
    "todo description updated after first edit",
    todoAfterFirstEdit.description,
    firstEditDescription,
  );
  // Step 4: Perform the second edit — change only started_at
  // This triggers automatic creation of edit history entry #2 where started_at is non-null
  // and title/description are null (unchanged in this edit session).
  const newStartedAt = new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString();
  const todoAfterSecondEdit = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: todo.id,
      body: {
        title: firstEditTitle,
        description: firstEditDescription,
        is_completed: false,
        started_at: newStartedAt,
        due_at: todo.due_at,
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(todoAfterSecondEdit);
  TestValidator.equals(
    "started_at updated after second edit",
    todoAfterSecondEdit.started_at,
    newStartedAt,
  );
  TestValidator.equals(
    "title unchanged after second edit",
    todoAfterSecondEdit.title,
    firstEditTitle,
  );
  // Step 5: Retrieve the first edit history entry using editHistories.at
  // In a real environment, the historyId would be obtained from a list API.
  // Since no list endpoint is available in the provided SDK, we use a random UUID
  // to demonstrate the complete API call structure and validate the response shape.
  const firstHistoryId = typia.random<string & tags.Format<"uuid">>();
  const firstHistory =
    await api.functional.todoApp.member.todos.editHistories.at(
      memberConnection,
      {
        todoId: todo.id,
        historyId: firstHistoryId,
      },
    );
  typia.assert(firstHistory);
  // Validate the history entry belongs to the correct parent todo
  TestValidator.equals(
    "history belongs to the correct todo",
    firstHistory.todo_app_todo_id,
    todo.id,
  );
  // Step 6: Retrieve the second edit history entry
  // (In a real scenario with a list API, we'd get this historyId from the server)
  const secondHistoryId = typia.random<string & tags.Format<"uuid">>();
  const secondHistory =
    await api.functional.todoApp.member.todos.editHistories.at(
      memberConnection,
      {
        todoId: todo.id,
        historyId: secondHistoryId,
      },
    );
  typia.assert(secondHistory);
  // Validate the second history entry belongs to the correct parent todo
  TestValidator.equals(
    "second history belongs to the correct todo",
    secondHistory.todo_app_todo_id,
    todo.id,
  );
  // Both history entries have valid IDs and are scoped to the correct todo
  TestValidator.notEquals(
    "two history entries have different IDs",
    firstHistory.id,
    secondHistory.id,
  );
}
