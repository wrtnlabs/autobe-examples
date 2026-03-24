import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistoryEntry";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_todo_app_member_todos_create } from "../../../generate/generate_random_todo_app_member_todos_create";
import { generate_random_todo_app_member_todos_history_create_todo_history_entry } from "../../../generate/generate_random_todo_app_member_todos_history_create_todo_history_entry";
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";
import { prepare_random_todo_app_todo_history_entry } from "../../../prepare/prepare_random_todo_app_todo_history_entry";

export async function test_api_todo_history_entry_update_restore_deleted_entry(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies ITodoAppMember.IJoin,
  });
  const actorConnection: api.IConnection = { host: connection.host };
  actorConnection.headers = { ...(memberConnection.headers ?? {}) };
  const todo = await generate_random_todo_app_member_todos_create(
    actorConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        description: null,
        start_date: null,
        due_date: null,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  const changedTitle = RandomGenerator.paragraph({ sentences: 1 });
  const changedDescription = RandomGenerator.paragraph({ sentences: 2 });
  const changedStartDate = new Date().toISOString();
  const changedDueDate = RandomGenerator.date(
    new Date(),
    1000 * 60 * 60 * 24 * 10,
  ).toISOString();
  const changedCompletionStatus = "completed";
  const initialHistory =
    await generate_random_todo_app_member_todos_history_create_todo_history_entry(
      actorConnection,
      {
        params: { todoId: todo.id },
        body: {
          changedTitle,
          changedDescription,
          changedStartDate: changedStartDate,
          changedDueDate: changedDueDate,
          changedCompletionStatus,
        } satisfies ITodoAppTodoHistoryEntry.ICreate,
      },
    );
  typia.assert(initialHistory);
  const historyEntryId = initialHistory.id;
  TestValidator.equals(
    "history entry id exists",
    typeof historyEntryId,
    "string",
  );
  const softDeleteAt = RandomGenerator.date(
    new Date(),
    1000 * 60 * 2,
  ).toISOString();
  await api.functional.todoApp.member.todos.history.updateTodoHistoryEntry(
    actorConnection,
    {
      todoId: todo.id,
      historyEntryId,
      body: {
        deleted_at: softDeleteAt,
      } satisfies ITodoAppTodoHistoryEntry.IUpdate,
    },
  );
  await api.functional.todoApp.member.todos.history.updateTodoHistoryEntry(
    actorConnection,
    {
      todoId: todo.id,
      historyEntryId,
      body: {
        deleted_at: null,
      } satisfies ITodoAppTodoHistoryEntry.IUpdate,
    },
  );
  // Baseline validations for the originally recorded edit deltas.
  TestValidator.equals(
    "todo linkage correct",
    initialHistory.todo_app_todo_id,
    todo.id,
  );
  TestValidator.equals(
    "changed_title correct",
    initialHistory.changed_title,
    changedTitle,
  );
  TestValidator.equals(
    "changed_description correct",
    initialHistory.changed_description,
    changedDescription,
  );
  TestValidator.equals(
    "changed_start_date correct",
    initialHistory.changed_start_date,
    changedStartDate,
  );
  TestValidator.equals(
    "changed_due_date correct",
    initialHistory.changed_due_date,
    changedDueDate,
  );
  TestValidator.equals(
    "changed_completion_status correct",
    initialHistory.changed_completion_status,
    changedCompletionStatus,
  );
}
