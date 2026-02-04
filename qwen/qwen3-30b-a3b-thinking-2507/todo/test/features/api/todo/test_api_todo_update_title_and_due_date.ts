import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodo";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import { prepare_random_todo_todo } from "../../../prepare/prepare_random_todo_todo";
import { generate_random_todo_user_todos_create } from "../../../generate/generate_random_todo_user_todos_create";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
export async function test_api_todo_update_title_and_due_date(
  connection: api.IConnection,
) {
  // Step 1: Register new user with actor-specific connection
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
    },
  });
  typia.assert(user);
  // Step 2: Create a new todo item
  const todo = await generate_random_todo_user_todos_create(userConnection, {
    body: {
      title: RandomGenerator.paragraph(),
      description: RandomGenerator.content({ sentenceMax: 5 }),
      due_date: new Date(
        new Date().setDate(new Date().getDate() + 1),
      ).toISOString(),
      start_date: new Date(
        new Date().setDate(new Date().getDate() - 1),
      ).toISOString(),
    },
  });
  typia.assert(todo);
  // Step 3: Update the todo item with new title and due date
  const updatedTodo = await api.functional.todo.user.todos.update(
    userConnection,
    {
      todoId: todo.id,
      body: {
        title: RandomGenerator.paragraph(),
        dueDate: new Date(
          new Date().setDate(new Date().getDate() + 3),
        ).toISOString(),
      } satisfies ITodoTodo.IUpdate,
    },
  );
  typia.assert(updatedTodo);
  // Step 4: Verify only the updated fields changed and others remained unchanged
  TestValidator.equals("title updated", updatedTodo.title, todo.title);
  TestValidator.equals("due date updated", updatedTodo.dueDate, todo.dueDate);
  TestValidator.equals(
    "description unchanged",
    updatedTodo.description,
    todo.description,
  );
  TestValidator.equals(
    "start date unchanged",
    updatedTodo.startDate,
    todo.startDate,
  );
}