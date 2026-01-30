import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodoItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoItem";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { prepare_random_todo_app_todo_item } from "../../../prepare/prepare_random_todo_app_todo_item";
import { generate_random_todo_app_user_todos_create } from "../../../generate/generate_random_todo_app_user_todos_create";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
export async function test_api_todo_creation_by_authenticated_user(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate user via join
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth: ITodoAppUser.IAuthorized = await authorize_user_join(
    userConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ITodoAppUser.IJoin,
    },
  );
  typia.assert(userAuth);
  // Step 2: Create todo item with non-empty text
  const todoItem: ITodoAppTodoItem =
    await api.functional.todoApp.user.todos.create(userConnection, {
      body: {
        text: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 10,
        }),
      } satisfies ITodoAppTodoItem.ICreate,
    });
  typia.assert(todoItem);
  // Step 3: Validate todo item properties
  TestValidator.equals(
    "todo item has assigned id",
    typeof todoItem.id,
    "string",
  );
  TestValidator.predicate(
    "todo item id is a UUID",
    /^[0-9a-f-]{36}$/.test(todoItem.id),
  );
  // Step 4: Validate user association
  TestValidator.equals(
    "todo item user id matches authenticated user",
    todoItem.user.id,
    userAuth.id,
  );
  // Step 5: Create second todo item for same user
  const secondTodoItem: ITodoAppTodoItem =
    await api.functional.todoApp.user.todos.create(userConnection, {
      body: {
        text: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 6,
        }),
      } satisfies ITodoAppTodoItem.ICreate,
    });
  typia.assert(secondTodoItem);
  // Step 6: Validate second todo item
  TestValidator.notEquals(
    "two todo items have different ids",
    todoItem.id,
    secondTodoItem.id,
  );
  TestValidator.equals(
    "second todo item has correct user association",
    secondTodoItem.user.id,
    userAuth.id,
  );
  // Note: No retrieval test possible as the API does not provide an endpoint to retrieve a single todo item
  // According to provided API SDK functions, only create() is available, no at() or index() endpoints for retrieving todos
}
