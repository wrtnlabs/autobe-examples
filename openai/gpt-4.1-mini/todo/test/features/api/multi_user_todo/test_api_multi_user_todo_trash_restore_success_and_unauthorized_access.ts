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

export async function test_api_multi_user_todo_trash_restore_success_and_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  /* Scenario 1: Successful restoration of a soft-deleted todo item by its owner. */
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, {
    body: {
      email: `user1_${RandomGenerator.alphabets(5)}@example.com`,
      password: "password123",
      display_name: RandomGenerator.name(),
    } satisfies IMultiUserTodoUser.IJoin,
  });
  userConnection.headers = { Authorization: `Bearer ${userAuth.token.access}` };
  // Create a todo for user1
  const todo = await generate_random_multi_user_todo_user_todos_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        start_date: null,
        due_date: null,
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(todo);
  // Attempt to restore the todo by user1 (owner) - expect success
  const restoredTodo = await api.functional.multiUserTodo.user.trash.restore(
    userConnection,
    {
      todoId: todo["id" as keyof typeof todo] as string,
    },
  );
  typia.assert(restoredTodo);
  /* Scenario 2: Unauthorized restoration attempt by a user who does not own the todo. */
  const otherUserConnection: api.IConnection = { host: connection.host };
  const otherUserAuth = await authorize_user_join(otherUserConnection, {
    body: {
      email: `user2_${RandomGenerator.alphabets(5)}@example.com`,
      password: "password123",
      display_name: RandomGenerator.name(),
    } satisfies IMultiUserTodoUser.IJoin,
  });
  otherUserConnection.headers = {
    Authorization: `Bearer ${otherUserAuth.token.access}`,
  };
  // User2 attempts to restore user1's todo - expect error
  await TestValidator.error(
    "unauthorized restore attempt by user 2",
    async () => {
      await api.functional.multiUserTodo.user.trash.restore(
        otherUserConnection,
        {
          todoId: todo["id" as keyof typeof todo] as string,
        },
      );
    },
  );
}
