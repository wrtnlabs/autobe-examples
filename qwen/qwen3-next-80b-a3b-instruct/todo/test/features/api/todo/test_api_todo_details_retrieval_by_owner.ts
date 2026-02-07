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

export async function test_api_todo_details_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new user account
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, {
    body: {},
  });
  typia.assert(userAuth);
  // 2. Create a todo item for the authenticated user
  // DTO definition: ICreate is empty object, so send empty body
  const todo = await generate_random_todo_app_user_todos_create(
    userConnection,
    {
      body: {},
    },
  );
  const assertedTodo = typia.assert<ITodoAppTodo & { id: string }>(todo);
  // 3. Retrieve the created todo using its ID
  const retrievedTodo = await api.functional.todoApp.user.todos.at(
    userConnection,
    {
      todoId: assertedTodo.id,
    },
  );
  const assertedRetrievedTodo = typia.assert<ITodoAppTodo & { id: string }>(retrievedTodo);
  // 4. Validate that the retrieved todo has an ID (required by IEntity)
  TestValidator.predicate("todo has id", assertedTodo.id !== undefined);
  TestValidator.predicate(
    "retrieved todo has id",
    assertedRetrievedTodo.id !== undefined,
  );
  TestValidator.equals(
    "todo id matches retrieved id",
    assertedTodo.id,
    assertedRetrievedTodo.id,
  );
}