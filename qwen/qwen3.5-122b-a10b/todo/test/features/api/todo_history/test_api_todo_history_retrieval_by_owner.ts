import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoHistory";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistory";
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

export async function test_api_todo_history_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  // 2. Create a todo
  const todo = await api.functional.todoApp.member.todos.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        startDate: new Date(Date.now() + 86400000).toISOString(),
        dueDate: new Date(Date.now() + 604800000).toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 3. Update the todo to create a history entry
  const updatedTitle = RandomGenerator.paragraph({ sentences: 2 });
  const updatedTodo = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: todo.id,
      body: {
        title: updatedTitle,
        description: null,
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(updatedTodo);
  // 4. List all history entries to get the history ID
  const histories = await api.functional.todoApp.member.todos.histories.index(
    memberConnection,
    {
      todoId: todo.id,
      body: {
        page: 1,
        limit: 10,
        sort_by: "created_at",
        order: "desc",
      } satisfies ITodoAppTodoHistory.IRequest,
    },
  );
  typia.assert(histories);
  // Must have at least one history entry
  TestValidator.predicate("has history entries", histories.data.length > 0);
  // Get the most recent history entry (first in desc order)
  const historyId = histories.data[0]!.id;
  // 5. Retrieve the specific history entry
  const history =
    await api.functional.todoApp.member.todoApp.todos.histories.at(
      memberConnection,
      {
        todoId: todo.id,
        historyId: historyId,
      },
    );
  typia.assert(history);
  // 6. Validate the history entry
  TestValidator.equals(
    "history belongs to correct todo",
    history.todo.id,
    todo.id,
  );
  // Validate that the title was changed (should have the updated title value)
  TestValidator.equals(
    "title matches updated value",
    history.title,
    updatedTitle,
  );
  // Validate that description was changed to null
  TestValidator.equals("description is null", history.description, null);
  // Validate that start_date and due_date were not changed (should be null in history)
  TestValidator.equals(
    "start_date is null (not changed)",
    history.start_date,
    null,
  );
  TestValidator.equals(
    "due_date is null (not changed)",
    history.due_date,
    null,
  );
  // Validate that completed was not changed (should be null in history)
  TestValidator.equals(
    "completed is null (not changed)",
    history.completed,
    null,
  );
}
