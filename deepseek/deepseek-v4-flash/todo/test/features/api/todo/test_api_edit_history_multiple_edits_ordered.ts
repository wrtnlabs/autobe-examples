import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppEditHistory";
import type { ITodoAppEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppEditHistory";
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

export async function test_api_edit_history_multiple_edits_ordered(
  connection: api.IConnection,
): Promise<void> {
  //----
  // 1. Join as a new member
  //----
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email,
      password: "password123!",
      display_name: RandomGenerator.name(),
      href: "http://localhost:3000/join",
      referrer: "http://localhost:3000/",
    } satisfies ITodoAppMember.IJoin,
  });
  //----
  // 2. Create a todo with specific fields
  //----
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: "Original Title",
        description: "Original description",
        start_date: "2026-04-01T00:00:00.000Z",
        due_date: "2026-04-10T00:00:00.000Z",
      },
    },
  );
  typia.assert(todo);
  //----
  // 3. First edit: change title only
  //----
  const updatedTodo1 = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: todo.id,
      body: {
        title: "Updated Title",
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(updatedTodo1);
  //----
  // 4. Second edit: change description and start_date
  //----
  const updatedTodo2 = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: todo.id,
      body: {
        description: "Updated description",
        start_date: "2026-04-05T00:00:00.000Z",
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(updatedTodo2);
  //----
  // 5. Retrieve edit history
  //----
  const history: IPageITodoAppEditHistory.ISummary =
    await api.functional.todoApp.member.todos.edit_histories.index(
      memberConnection,
      {
        todoId: todo.id,
        body: {} satisfies ITodoAppEditHistory.IRequest,
      },
    );
  typia.assert(history);
  //----
  // 6. Validate pagination metadata
  //----
  TestValidator.equals("current page", history.pagination.current, 1);
  TestValidator.equals("total records", history.pagination.records, 2);
  TestValidator.equals("total pages", history.pagination.pages, 1);
  //----
  // 7. Validate history entries count
  //----
  TestValidator.equals("history entry count", history.data.length, 2);
  //----
  // 8. Validate first entry (most recent - description and start_date changed)
  //----
  const firstEntry: ITodoAppEditHistory.ISummary = history.data[0];
  TestValidator.predicate(
    "first entry has created_at",
    firstEntry.created_at !== null && typeof firstEntry.created_at === "string",
  );
  TestValidator.equals(
    "first entry title is null (unchanged)",
    firstEntry.title,
    null,
  );
  TestValidator.equals(
    "first entry description updated",
    firstEntry.description,
    "Updated description",
  );
  TestValidator.equals(
    "first entry start_date updated",
    firstEntry.start_date,
    "2026-04-05T00:00:00.000Z",
  );
  TestValidator.equals(
    "first entry due_date is null (unchanged)",
    firstEntry.due_date,
    null,
  );
  //----
  // 9. Validate second entry (older - title changed)
  //----
  const secondEntry: ITodoAppEditHistory.ISummary = history.data[1];
  TestValidator.predicate(
    "second entry has created_at",
    secondEntry.created_at !== null &&
      typeof secondEntry.created_at === "string",
  );
  TestValidator.equals(
    "second entry title updated",
    secondEntry.title,
    "Updated Title",
  );
  TestValidator.equals(
    "second entry description is null (unchanged)",
    secondEntry.description,
    null,
  );
  TestValidator.equals(
    "second entry start_date is null (unchanged)",
    secondEntry.start_date,
    null,
  );
  TestValidator.equals(
    "second entry due_date is null (unchanged)",
    secondEntry.due_date,
    null,
  );
  //----
  // 10. Verify order: most recent first
  //----
  TestValidator.predicate(
    "history entries sorted most recent first",
    new Date(firstEntry.created_at).getTime() >
      new Date(secondEntry.created_at).getTime(),
  );
}
