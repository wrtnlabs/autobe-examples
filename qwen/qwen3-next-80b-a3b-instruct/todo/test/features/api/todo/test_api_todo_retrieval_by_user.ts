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

export async function test_api_todo_retrieval_by_user(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new authentication connection for the user
  const userConnection: api.IConnection = { host: connection.host };
  // Step 2: Authenticate user and create account
  const user: ITodoAppUser.IAuthorized = await authorize_user_join(
    userConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      },
    },
  );
  typia.assert(user);
  // Step 3: Generate random todo item data using correct DTO type
  const todoData: ITodoAppTodo.ICreate = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    description: typia.random<string & tags.MaxLength<2000>>() ?? null,
    start_date: typia.random<string & tags.Format<"date-time">>() ?? null,
    due_date: typia.random<string & tags.Format<"date-time">>() ?? null,
  } satisfies ITodoAppTodo.ICreate;
  // Step 4: Create the todo item using the user's authenticated connection
  const createdTodo: ITodoAppTodo =
    await generate_random_todo_app_user_todos_create(userConnection, {
      body: todoData,
    });
  typia.assert(createdTodo);
  // Step 5: Retrieve the todo item using its ID and user's authenticated connection
  const retrievedTodo: ITodoAppTodo =
    await api.functional.todoApp.user.todos.at(userConnection, {
      todoId: createdTodo.id,
    });
  typia.assert(retrievedTodo);
  // Step 6: Validate that the retrieved todo matches the created todo's properties
  TestValidator.equals(
    "todo id should match",
    retrievedTodo.id,
    createdTodo.id,
  );
  TestValidator.equals(
    "todo title should match",
    retrievedTodo.title,
    createdTodo.title,
  );
  TestValidator.equals(
    "todo description should match",
    retrievedTodo.description,
    createdTodo.description,
  );
  TestValidator.equals(
    "todo completion status should match",
    retrievedTodo.completion_status,
    false,
  ); // Default is false
  TestValidator.equals(
    "todo created_at should match",
    retrievedTodo.created_at,
    createdTodo.created_at,
  );
  TestValidator.equals(
    "todo updated_at should match",
    retrievedTodo.updated_at,
    createdTodo.updated_at,
  );
  TestValidator.equals(
    "todo start_date should match",
    retrievedTodo.start_date,
    createdTodo.start_date,
  );
  TestValidator.equals(
    "todo due_date should match",
    retrievedTodo.due_date,
    createdTodo.due_date,
  );
  TestValidator.equals(
    "todo is_deleted should be false",
    retrievedTodo.is_deleted,
    false,
  );
  // Step 7: Test that non-existent todo returns 404 Not Found
  await TestValidator.error("non-existent todo should return 404", async () => {
    await api.functional.todoApp.user.todos.at(userConnection, {
      todoId: "00000000-0000-0000-0000-000000000000",
    });
  });
  // Step 8: Test that unauthorized user cannot access todo (should return 404)
  const differentUserConnection: api.IConnection = { host: connection.host };
  const differentUser: ITodoAppUser.IAuthorized = await authorize_user_join(
    differentUserConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      },
    },
  );
  typia.assert(differentUser);
  await TestValidator.error(
    "unauthorized user cannot access others' todo",
    async () => {
      await api.functional.todoApp.user.todos.at(differentUserConnection, {
        todoId: createdTodo.id,
      });
    },
  );
}
