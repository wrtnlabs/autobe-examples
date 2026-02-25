import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPrincipal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrincipal";
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

export async function test_api_todo_retrieval_active(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new user using actor-specific connection
  const userConnection: api.IConnection = { host: connection.host };
  const registeredUser = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(registeredUser);
  // Step 2: Create a new todo item
  const todoInput = {
    title: RandomGenerator.paragraph({ sentences: 1 }),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    startDate: new Date().toISOString(),
    dueDate: new Date(Date.now() + 86400000).toISOString(), // +1 day
  } satisfies ITodoAppTodo.ICreate;
  const createdTodo = await api.functional.todoApp.user.todos.create(
    userConnection,
    {
      body: todoInput,
    },
  );
  typia.assert(createdTodo);
  // Step 3: Retrieve the todo by ID
  const retrievedTodo = await api.functional.todoApp.user.todos.at(
    userConnection,
    {
      todoId: createdTodo.id,
    },
  );
  typia.assert(retrievedTodo);
  // Step 4: Validate retrieved todo matches created todo
  TestValidator.equals(
    "todo title matches",
    retrievedTodo.title,
    todoInput.title,
  );
  TestValidator.equals(
    "todo description matches",
    retrievedTodo.description,
    todoInput.description,
  );
  TestValidator.equals(
    "todo start_date matches",
    retrievedTodo.start_date,
    todoInput.startDate,
  );
  TestValidator.equals(
    "todo due_date matches",
    retrievedTodo.due_date,
    todoInput.dueDate,
  );
  TestValidator.equals(
    "todo is_complete is false",
    retrievedTodo.is_complete,
    false,
  );
  TestValidator.equals(
    "todo is_deleted is false",
    retrievedTodo.is_deleted,
    false,
  );
  TestValidator.equals(
    "todo user id matches",
    retrievedTodo.user.id,
    registeredUser.id,
  );
  TestValidator.predicate(
    "todo has valid created_at",
    new Date(retrievedTodo.created_at) <= new Date(),
  );
  TestValidator.predicate(
    "todo has valid updated_at",
    new Date(retrievedTodo.updated_at) <= new Date(),
  );
}
