import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodo";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import { prepare_random_todo_todo } from "../../../prepare/prepare_random_todo_todo";
import { generate_random_todo_user_todos_create } from "../../../generate/generate_random_todo_user_todos_create";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
export async function test_api_todo_deletion_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create User A for todo creation
  const userAConnection: api.IConnection = { host: connection.host };
  const userA = await authorize_user_join(userAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(userA);
  // Step 2: User A creates a todo
  const todo = await generate_random_todo_user_todos_create(userAConnection, {
    body: {
      title: RandomGenerator.paragraph({ sentences: 3 }),
      description: RandomGenerator.content(),
      start_date: typia.random<string & tags.Format<"date-time">>(),
      due_date: typia.random<string & tags.Format<"date-time">>(),
    },
  });
  typia.assert(todo);
  // Step 3: Create User B for unauthorized deletion attempt
  const userBConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // Step 4: User B attempts to delete User A's todo (should fail)
  await TestValidator.error(
    "unauthorized access to delete another user's todo",
    async () => {
      await api.functional.todo.user.todos.erase(userBConnection, {
        todoId: todo.id,
      });
    },
  );
}
