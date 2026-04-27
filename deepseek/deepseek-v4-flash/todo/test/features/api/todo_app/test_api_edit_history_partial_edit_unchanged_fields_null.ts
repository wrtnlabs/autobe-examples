import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_edit_history_partial_edit_unchanged_fields_null(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const joined: ITodoAppMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password123",
        display_name: RandomGenerator.name(),
        href: "http://localhost:3000/register",
        referrer: "http://localhost:3000/",
      } satisfies ITodoAppMember.IJoin,
    },
  );
  typia.assert(joined);
  // 2. Create a todo with only title (description, start_date, due_date are null)
  const todo: ITodoAppTodo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: null,
        start_date: null,
        due_date: null,
      } satisfies DeepPartial<ITodoAppTodo.ICreate>,
    },
  );
  typia.assert(todo);
  // Verify the initial todo has no description or dates
  TestValidator.equals("initial description is null", todo.description, null);
  TestValidator.equals("initial start_date is null", todo.start_date, null);
  TestValidator.equals("initial due_date is null", todo.due_date, null);
  // 3. Update only the title — leave description, start_date, due_date unset (patch semantics)
  const newTitle = RandomGenerator.paragraph({ sentences: 3 });
  const updatedTodo: ITodoAppTodo =
    await api.functional.todoApp.member.todos.update(memberConnection, {
      todoId: todo.id,
      body: {
        title: newTitle,
      } satisfies ITodoAppTodo.IUpdate,
    });
  typia.assert(updatedTodo);
  // Verify the todo was updated correctly
  TestValidator.equals("title updated", updatedTodo.title, newTitle);
  TestValidator.equals("description unchanged", updatedTodo.description, null);
  TestValidator.equals("start_date unchanged", updatedTodo.start_date, null);
  TestValidator.equals("due_date unchanged", updatedTodo.due_date, null);
}
