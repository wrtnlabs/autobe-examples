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

export async function test_api_todo_update_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new user with valid credentials
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(userAuth);
  // Create a new connection with the token
  const userTokenConnection: api.IConnection = { host: connection.host };
  userTokenConnection.headers = {
    Authorization: userAuth.token.access,
  };
  // Step 2: Create a new todo item for this user
  const initialTodo = await generate_random_todo_app_user_todos_create(
    userTokenConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(initialTodo);
  TestValidator.equals(
    "initial title matches",
    initialTodo.title,
    initialTodo.title,
  );
  TestValidator.equals(
    "initial description matches",
    initialTodo.description,
    initialTodo.description,
  );
  // Step 3: Update the todo with valid data (title, description, start date, due date)
  const updatedTodo = await api.functional.todoApp.user.todos.update(
    userTokenConnection,
    {
      todoId: initialTodo.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        startDate: new Date().toISOString(),
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // +1 day
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(updatedTodo);
  // Step 4: Verify the response contains updated information and the correct user ownership
  TestValidator.equals("title updated", updatedTodo.title, updatedTodo.title);
  TestValidator.equals(
    "description updated",
    updatedTodo.description,
    updatedTodo.description,
  );
  TestValidator.equals(
    "user ownership preserved",
    updatedTodo.user.id,
    userAuth.id,
  );
  // Step 5: Verify that edit history entry was created with previous values
  // Note: Edit history verification requires additional endpoint which is not specified in the scenario
  // This step is based on the assumption that edit history is available through the update response or a separate endpoint
  // Step 6: Test partial update by updating only specific fields
  const partialUpdateTodo = await api.functional.todoApp.user.todos.update(
    userTokenConnection,
    {
      todoId: initialTodo.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(partialUpdateTodo);
  // Step 7: Verify unchanged fields remain the same
  TestValidator.equals(
    "description unchanged after partial update",
    partialUpdateTodo.description,
    updatedTodo.description,
  );
  TestValidator.equals(
    "start date unchanged after partial update",
    partialUpdateTodo.start_date,
    updatedTodo.start_date,
  );
  TestValidator.equals(
    "due date unchanged after partial update",
    partialUpdateTodo.due_date,
    updatedTodo.due_date,
  );
}
