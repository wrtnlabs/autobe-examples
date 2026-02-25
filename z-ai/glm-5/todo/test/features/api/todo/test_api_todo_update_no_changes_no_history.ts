import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_todo_app_user_todos_create } from "../../../generate/generate_random_todo_app_user_todos_create";
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";

/**
 * Test the edge case where an update request contains values identical to the current todo state.
 * Create a todo with specific title, description, and dates, then send an update request with
 * the exact same values. Verify that the request succeeds and no unnecessary history entry
 * is created since no fields actually changed.
 */
export async function test_api_todo_update_no_changes_no_history(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_user_join(userConnection, {});
  typia.assert(authResult);
  // 2. Create a todo with specific values
  const title = RandomGenerator.paragraph({ sentences: 3 });
  const description = RandomGenerator.content({ paragraphs: 2 });
  const now = new Date();
  const startDate = new Date(now.getTime() + 1000 * 60 * 60 * 24).toISOString(); // 1 day from now
  const dueDate = new Date(
    now.getTime() + 1000 * 60 * 60 * 24 * 7,
  ).toISOString(); // 7 days from now
  const todo = await generate_random_todo_app_user_todos_create(
    userConnection,
    {
      body: {
        title,
        description,
        startDate,
        dueDate,
      },
    },
  );
  typia.assert(todo);
  // 3. Update the todo with the exact same values
  const updatedTodo = await api.functional.todoApp.user.todos.update(
    userConnection,
    {
      todoId: todo.id,
      body: {
        title: todo.title satisfies string as string,
        description: todo.description,
        start_date: todo.startDate,
        due_date: todo.dueDate,
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(updatedTodo);
  // 4. Verify the update succeeded and values remain unchanged
  TestValidator.equals("title unchanged", updatedTodo.title, todo.title);
  TestValidator.equals(
    "description unchanged",
    updatedTodo.description,
    todo.description,
  );
  TestValidator.equals(
    "startDate unchanged",
    updatedTodo.startDate,
    todo.startDate,
  );
  TestValidator.equals("dueDate unchanged", updatedTodo.dueDate, todo.dueDate);
  TestValidator.equals(
    "completion status unchanged",
    updatedTodo.isCompleted,
    todo.isCompleted,
  );
  TestValidator.equals("id unchanged", updatedTodo.id, todo.id);
}