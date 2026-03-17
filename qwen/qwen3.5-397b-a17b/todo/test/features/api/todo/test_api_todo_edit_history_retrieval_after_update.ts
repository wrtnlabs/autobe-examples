import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoEditHistory";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoEditHistory";
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

export async function test_api_todo_edit_history_retrieval_after_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(member);
  // 2. Create a todo with title, description, start date, and due date
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        started_at: new Date().toISOString(),
        due_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
    },
  );
  typia.assert(todo);
  // 3. Update the todo's title and description to trigger edit history creation
  const newTitle = RandomGenerator.paragraph({ sentences: 3 });
  const newDescription = RandomGenerator.content({ paragraphs: 3 });
  const updatedTodo = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: todo.id,
      body: {
        title: newTitle,
        description: newDescription,
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(updatedTodo);
  // 4. Retrieve the list of edit histories to obtain the editHistoryId
  const editHistoriesPage =
    await api.functional.todoApp.member.todos.edit_histories.index(
      memberConnection,
      {
        todoId: todo.id,
        body: {
          page: 1,
          limit: 20,
          sort: "created_at",
          order: "desc",
        } satisfies ITodoAppTodoEditHistory.IRequest,
      },
    );
  typia.assert(editHistoriesPage);
  // Validate we have at least one edit history entry (the update we just made)
  TestValidator.predicate(
    "has edit history entries",
    editHistoriesPage.data.length >= 1,
  );
  // Get the most recent edit history entry (the update operation)
  const editHistoryEntry = editHistoriesPage.data[0];
  TestValidator.predicate(
    "edit history has valid id",
    editHistoryEntry.id !== undefined && editHistoryEntry.id !== null,
  );
  // 5. Retrieve the specific edit history entry using the target endpoint
  const specificEditHistory =
    await api.functional.todoApp.member.todos.edit_histories.at(
      memberConnection,
      {
        todoId: todo.id,
        editHistoryId: editHistoryEntry.id,
      },
    );
  typia.assert(specificEditHistory);
  // Validate the edit history contains correct data
  TestValidator.equals(
    "todo_app_todo_id matches",
    specificEditHistory.todo_app_todo_id,
    todo.id,
  );
  TestValidator.equals(
    "title contains new value",
    specificEditHistory.title,
    newTitle,
  );
  TestValidator.equals(
    "description contains new value",
    specificEditHistory.description,
    newDescription,
  );
  TestValidator.equals(
    "started_at is null (not changed)",
    specificEditHistory.started_at,
    null,
  );
  TestValidator.equals(
    "due_at is null (not changed)",
    specificEditHistory.due_at,
    null,
  );
  TestValidator.equals(
    "completed is null (not changed)",
    specificEditHistory.completed,
    null,
  );
  TestValidator.predicate(
    "created_at is valid timestamp",
    specificEditHistory.created_at !== null,
  );
}
