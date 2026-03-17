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

export async function test_api_todo_edit_history_partial_field_changes(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(member);
  // 2. Create a todo with all fields populated
  const originalTitle = RandomGenerator.paragraph({ sentences: 2 });
  const originalDescription = RandomGenerator.content({ paragraphs: 2 });
  const originalStartedAt = new Date().toISOString();
  const originalDueAt = new Date(
    Date.now() + 1000 * 60 * 60 * 24 * 7,
  ).toISOString();
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: originalTitle,
        description: originalDescription,
        started_at: originalStartedAt,
        due_at: originalDueAt,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 3. Update only the title field (partial update - other fields omitted)
  const newTitle = RandomGenerator.paragraph({ sentences: 1 });
  const updatedTodo = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: todo.id,
      body: {
        title: newTitle,
        // description, started_at, due_at are intentionally omitted to test partial update
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(updatedTodo);
  // 4. Retrieve edit history list to get the editHistoryId for the update
  const editHistories =
    await api.functional.todoApp.member.todos.edit_histories.index(
      memberConnection,
      {
        todoId: todo.id,
        body: {
          page: 1,
          limit: 10,
          sort: "created_at",
          order: "desc",
        } satisfies ITodoAppTodoEditHistory.IRequest,
      },
    );
  typia.assert(editHistories);
  // Should have at least 2 entries: one for creation, one for update
  TestValidator.predicate(
    "has edit history entries",
    editHistories.data.length >= 2,
  );
  // The first entry is the most recent (the update we just made)
  const updateHistorySummary = editHistories.data[0];
  // 5. Retrieve the specific edit history entry
  const editHistory =
    await api.functional.todoApp.member.todos.edit_histories.at(
      memberConnection,
      {
        todoId: todo.id,
        editHistoryId: updateHistorySummary.id,
      },
    );
  typia.assert(editHistory);
  // 6. Validate partial field changes - only title should have value, others should be null
  TestValidator.equals(
    "title changed to new value",
    editHistory.title,
    newTitle,
  );
  TestValidator.equals(
    "description unchanged (null)",
    editHistory.description,
    null,
  );
  TestValidator.equals(
    "started_at unchanged (null)",
    editHistory.started_at,
    null,
  );
  TestValidator.equals("due_at unchanged (null)", editHistory.due_at, null);
  TestValidator.equals(
    "completed unchanged (null)",
    editHistory.completed,
    null,
  );
}
