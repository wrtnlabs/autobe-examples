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

export async function test_api_todo_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated user connection
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test1234",
      display_name: "Test User",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);
  // Create test todo
  const todo = await generate_random_todo_app_user_todos_create(
    userConnection,
    {
      body: {
        title: "Test Todo",
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // Retrieve the todo
  const retrievedTodo = await api.functional.todoApp.user.todos.at(
    userConnection,
    {
      todoId: todo.id,
    },
  );
  typia.assert(retrievedTodo);
  // Validate the retrieval response
  TestValidator.equals("todo id matches", retrievedTodo.id, todo.id);
  TestValidator.equals("todo title matches", retrievedTodo.title, "Test Todo");
  TestValidator.equals("user id matches", retrievedTodo.user.id, user.id);
  TestValidator.equals(
    "user email matches",
    retrievedTodo.user.email,
    user.email,
  );
  TestValidator.equals(
    "user display name matches",
    retrievedTodo.user.display_name,
    user.display_name,
  );
  TestValidator.predicate(
    "created_at is valid",
    retrievedTodo.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is valid",
    retrievedTodo.updated_at.length > 0,
  );
  TestValidator.predicate(
    "completion_status is boolean",
    typeof retrievedTodo.completion_status === "boolean",
  );
  TestValidator.equals("deleted_at is null", retrievedTodo.deleted_at, null);
}
