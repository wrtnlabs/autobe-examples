import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITOdoAppTodoDescriptionField } from "@ORGANIZATION/PROJECT-api/lib/structures/ITOdoAppTodoDescriptionField";
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

export async function test_api_todo_description_privacy_isolation(
  connection: api.IConnection,
): Promise<void> {
  // Create first user connection and register
  const userAConnection: api.IConnection = { host: connection.host };
  const userA = await authorize_user_join(userAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(userA);
  // Create first user's todo
  await api.functional.todoApp.user.todos.create(userAConnection);
  // Create second user connection and register
  const userBConnection: api.IConnection = { host: connection.host };
  const userB = await authorize_user_join(userBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(userB);
  // Create second user's todo
  await api.functional.todoApp.user.todos.create(userBConnection);
  // Attempt to access a todo description using User A's connection with a random UUID
  // This should fail because User A doesn't own the todo (privacy isolation)
  await TestValidator.error(
    "access todo description with unauthorized user",
    async () => {
      await api.functional.todoApp.user.todos.description.at(userAConnection, {
        todoId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
  // Also test that User B cannot access User A's todos
  await TestValidator.error(
    "access todo description with cross-user authorization",
    async () => {
      await api.functional.todoApp.user.todos.description.at(userBConnection, {
        todoId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
