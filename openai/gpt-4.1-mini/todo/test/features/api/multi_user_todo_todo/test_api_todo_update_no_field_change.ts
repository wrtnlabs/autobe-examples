import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IMultiUserTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_multi_user_todo_user_todos_create } from "../../../generate/generate_random_multi_user_todo_user_todos_create";
import { prepare_random_multi_user_todo_todo } from "../../../prepare/prepare_random_multi_user_todo_todo";

export async function test_api_todo_update_no_field_change(
  connection: api.IConnection,
): Promise<void> {
  /*
   * Scenario:
   * - Authenticate a new user using authorize_user_join utility.
   * - Create a new todo with generate_random_multi_user_todo_user_todos_create utility.
   * - Call update API with the todoId but do not change any of the fields.
   * - Validate that the response todo is the same in all fields that could be updated.
   * - Validate that the user id association has not changed.
   */
  // Create user and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(20),
      displayName: RandomGenerator.name(),
      href: "https://example.com/join",
      referrer: "https://referrer.example.com",
    } satisfies IMultiUserTodoUser.IJoin,
  });
  // Update userConnection headers with user token
  userConnection.headers ??= {};
  userConnection.headers.Authorization = userAuth.token.access;
  // Create a todo
  const createdTodo = await generate_random_multi_user_todo_user_todos_create(
    userConnection,
    {},
  );
  typia.assert(createdTodo);
  // Prepare no change update object
  const noChangeUpdate: IMultiUserTodoTodo.IUpdate = {
    title: createdTodo.title,
    description: createdTodo.description,
    startDate: createdTodo.startDate,
    dueDate: createdTodo.dueDate,
  };
  // Call update API
  const updatedTodo = await api.functional.multiUserTodo.user.todos.update(
    userConnection,
    {
      todoId: createdTodo.id,
      body: noChangeUpdate,
    },
  );
  typia.assert(updatedTodo);
  // Validate fields remain unchanged
  TestValidator.equals("todo id same", updatedTodo.id, createdTodo.id);
  TestValidator.equals(
    "todo user id same",
    updatedTodo.user.id,
    createdTodo.user.id,
  );
  TestValidator.equals(
    "todo title unchanged",
    updatedTodo.title,
    createdTodo.title,
  );
  TestValidator.equals(
    "todo description unchanged",
    updatedTodo.description,
    createdTodo.description,
  );
  TestValidator.equals(
    "todo startDate unchanged",
    updatedTodo.startDate,
    createdTodo.startDate,
  );
  TestValidator.equals(
    "todo dueDate unchanged",
    updatedTodo.dueDate,
    createdTodo.dueDate,
  );
  TestValidator.equals(
    "todo completed status unchanged",
    updatedTodo.completed,
    createdTodo.completed,
  );
  TestValidator.equals(
    "todo deletedAt unchanged",
    updatedTodo.deletedAt,
    createdTodo.deletedAt,
  );
}
