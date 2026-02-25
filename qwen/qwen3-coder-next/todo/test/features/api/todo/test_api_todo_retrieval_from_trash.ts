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

export async function test_api_todo_retrieval_from_trash(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for user
  const userConnection: api.IConnection = { host: connection.host };
  // Step 1: User registration
  const registeredUser = await api.functional.todoApp.auth.user.join(
    userConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
      } satisfies ITodoAppUser.IJoin,
    },
  );
  typia.assert(registeredUser);
  // Update connection with authentication token from registration
  userConnection.headers = {
    ...userConnection.headers,
    Authorization: registeredUser.token.access,
  };
  // Step 2: Create a todo item
  const createdTodo = await api.functional.todoApp.user.todos.create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(createdTodo);
  // Step 3: Soft-delete the todo to move it to trash
  await api.functional.todoApp.user.todos.erase(userConnection, {
    todoId: createdTodo.id,
  });
  // Step 4: Retrieve the deleted todo from trash
  const deletedTodo = await api.functional.todoApp.user.todos.at(
    userConnection,
    {
      todoId: createdTodo.id,
    },
  );
  typia.assert(deletedTodo);
  // Validation: Check that the todo is in trash state
  TestValidator.equals("todo is deleted", deletedTodo.is_deleted, true);
  TestValidator.equals("title matches", deletedTodo.title, createdTodo.title);
  TestValidator.equals(
    "description matches",
    deletedTodo.description,
    createdTodo.description,
  );
  TestValidator.predicate(
    "has deletion timestamp",
    deletedTodo.deleted_at !== null && deletedTodo.deleted_at !== undefined,
  );
}
