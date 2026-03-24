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

export async function test_api_todo_history_entry_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1) Create and authorize member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(member);
  // 2) Create a todo
  const now = new Date();
  const todoTitle = RandomGenerator.paragraph({ sentences: 1 });
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: todoTitle satisfies string,
        description: RandomGenerator.paragraph({ sentences: 1 }),
        start_date: null,
        due_date: null,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 3) Create history entry #1 with a mix of changed and unchanged fields
  const editTitle = RandomGenerator.paragraph({ sentences: 1 });
  const editDescription = RandomGenerator.paragraph({ sentences: 2 });
  const editStartDate = RandomGenerator.date(
    now,
    1000 * 60 * 60 * 24,
  ).toISOString();
  const historyEntry1Payload: ITodoAppTodoHistoryEntry.ICreate = {
    changedTitle: editTitle,
    changedDescription: editDescription,
    changedStartDate: editStartDate,
    changedDueDate: null,
    changedCompletionStatus: null,
  };
  const historyEntry1 =
    await generate_random_todo_app_member_todos_history_create_todo_history_entry(
      memberConnection,
      {
        params: { todoId: todo.id },
        body: historyEntry1Payload,
      },
    );
  typia.assert(historyEntry1);
  // 3b) Create an additional history entry to ensure lookup is by exact ID
  const editDueDate = RandomGenerator.date(
    now,
    1000 * 60 * 60 * 48,
  ).toISOString();
  const historyEntry2Payload: ITodoAppTodoHistoryEntry.ICreate = {
    changedTitle: null,
    changedDescription: null,
    changedStartDate: null,
    changedDueDate: editDueDate,
    changedCompletionStatus: typia.random<string>(),
  };
  const historyEntry2 =
    await generate_random_todo_app_member_todos_history_create_todo_history_entry(
      memberConnection,
      {
        params: { todoId: todo.id },
        body: historyEntry2Payload,
      },
    );
  typia.assert(historyEntry2);
  // 4) Retrieve the requested history entry
  const retrieved = await api.functional.todoApp.member.todos.history.at(
    memberConnection,
    {
      todoId: todo.id,
      historyEntryId: historyEntry1.id,
    },
  );
  typia.assert(retrieved);
  // 5) Validations
  TestValidator.equals("history id", retrieved.id, historyEntry1.id);
  TestValidator.equals("todo_app_todo_id", retrieved.todo_app_todo_id, todo.id);
  TestValidator.equals(
    "changed_title matches",
    retrieved.changed_title,
    historyEntry1Payload.changedTitle,
  );
  TestValidator.equals(
    "changed_description matches",
    retrieved.changed_description,
    historyEntry1Payload.changedDescription,
  );
  TestValidator.equals(
    "changed_start_date matches",
    retrieved.changed_start_date,
    historyEntry1Payload.changedStartDate,
  );
  TestValidator.equals(
    "changed_due_date is null",
    retrieved.changed_due_date,
    null,
  );
  TestValidator.equals(
    "changed_completion_status is null",
    retrieved.changed_completion_status,
    null,
  );
  // Endpoint must be read-only; repeated read should be stable
  const retrievedAgain = await api.functional.todoApp.member.todos.history.at(
    memberConnection,
    {
      todoId: todo.id,
      historyEntryId: historyEntry1.id,
    },
  );
  typia.assert(retrievedAgain);
  TestValidator.equals(
    "read is stable id",
    retrievedAgain.id,
    historyEntry1.id,
  );
  TestValidator.equals(
    "read is stable changed_title",
    retrievedAgain.changed_title,
    historyEntry1Payload.changedTitle,
  );
}
