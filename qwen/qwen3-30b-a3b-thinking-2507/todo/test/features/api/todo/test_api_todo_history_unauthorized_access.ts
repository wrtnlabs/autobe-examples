import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoHistory";
import type { ITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodo";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import { prepare_random_todo_todo } from "../../../prepare/prepare_random_todo_todo";
import { generate_random_todo_user_todos_create } from "../../../generate/generate_random_todo_user_todos_create";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
export async function test_api_todo_history_unauthorized_access(
  connection: api.IConnection,
) {
  // Create primary test user
  const primaryUserConnection: api.IConnection = { host: connection.host };
  const primaryUser: ITodoUser.IAuthorized = await authorize_user_join(
    primaryUserConnection,
    {
      body: {
        email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
        password: "password123!",
      },
    },
  );
  // Create secondary test user
  const secondaryUserConnection: api.IConnection = { host: connection.host };
  const secondaryUser: ITodoUser.IAuthorized = await authorize_user_join(
    secondaryUserConnection,
    {
      body: {
        email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
        password: "password123!",
      },
    },
  );
  // Create a todo item for the primary user
  const primaryTodo: ITodoTodo = await generate_random_todo_user_todos_create(
    primaryUserConnection,
    {
      body: {
        title: RandomGenerator.paragraph(),
      },
    },
  );
  // Try to access the history as the secondary user (should fail with 403)
  await TestValidator.error(
    "Secondary user cannot access primary user's todo history",
    async () => {
      await api.functional.todo.user.todos.histories.at(
        secondaryUserConnection,
        {
          todoId: primaryTodo.id,
          historyId: "00000000-0000-0000-0000-000000000000",
        },
      );
    },
  );
}
