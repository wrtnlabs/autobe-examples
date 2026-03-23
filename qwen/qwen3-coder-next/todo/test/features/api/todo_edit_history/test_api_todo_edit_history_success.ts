import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import type { IPageITodoAppTodoEdit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoEdit";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoEdit } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoEdit";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
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

export async function test_api_todo_edit_history_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member session
  const memberConnection: api.IConnection = { host: connection.host };
  const memberInfo = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<
        string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">
      >(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMemberSession.IJoin,
  });
  typia.assert(memberInfo);
  // 2. Create a todo
  const todo = await api.functional.todoApp.member.todos.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        due_date: new Date().toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 3. Edit todo title
  const editedTodo1 = await api.functional.todoApp.member.todos.create(
    memberConnection,
    {
      body: {
        title: `${todo.title} (edited)`,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(editedTodo1);
  // 4. Edit todo description
  const editedTodo2 = await api.functional.todoApp.member.todos.create(
    memberConnection,
    {
      body: {
        title: `${todo.title} (edited)`,
        description: `${todo.description} - updated`,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(editedTodo2);
  // 5. Edit todo due date
  const newDueDate = new Date(new Date().getTime() + 86400000).toISOString();
  const editedTodo3 = await api.functional.todoApp.member.todos.create(
    memberConnection,
    {
      body: {
        title: `${todo.title} (edited)`,
        description: `${todo.description} - updated`,
        due_date: newDueDate,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(editedTodo3);
  // 6. Verify edit history
  const historyPage =
    await api.functional.todoApp.member.todos.edit_history.index(
      memberConnection,
      {
        todoId: todo.id,
      },
    );
  typia.assert(historyPage);
  TestValidator.equals("has 3 history entries", historyPage.data.length, 3);
  // Verify reverse chronological order
  if (historyPage.data.length >= 2) {
    TestValidator.predicate(
      "most recent first",
      () =>
        new Date(historyPage.data[0].edited_at) >=
        new Date(historyPage.data[1].edited_at),
    );
  }
  // Verify specific field changes in order (newest first)
  const newest = historyPage.data[0];
  TestValidator.equals(
    "last edit is due_date change",
    newest.previous_due_date,
    todo.due_date,
  );
  TestValidator.equals(
    "last edit new due_date",
    newest.new_due_date,
    newDueDate,
  );
  const second = historyPage.data[1];
  TestValidator.equals(
    "second edit is description change",
    second.previous_description,
    todo.description,
  );
  TestValidator.equals(
    "second edit new description",
    second.new_description,
    `${todo.description} - updated`,
  );
  const third = historyPage.data[2];
  TestValidator.equals(
    "third edit is title change",
    third.previous_title,
    todo.title,
  );
  TestValidator.equals(
    "third edit new title",
    third.new_title,
    `${todo.title} (edited)`,
  );
}
