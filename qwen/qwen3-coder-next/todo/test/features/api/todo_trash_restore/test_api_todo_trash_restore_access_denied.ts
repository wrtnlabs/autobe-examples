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

export async function test_api_todo_trash_restore_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first user and log in
  const userAConnection: api.IConnection = { host: connection.host };
  const userA = await api.functional.todoApp.auth.user.join(userAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(userA);
  // 2. User A creates a todo item
  const todo = await api.functional.todoApp.user.todos.create(userAConnection, {
    body: {
      title: RandomGenerator.paragraph({ sentences: 2 }),
      description: RandomGenerator.paragraph({ sentences: 3 }),
    } satisfies ITodoAppTodo.ICreate,
  });
  typia.assert(todo);
  // 3. User A deletes the todo (moves to trash)
  await api.functional.todoApp.user.todos.erase(userAConnection, {
    todoId: (todo as ITodoAppTodo & IEntity).id,
  });
  // 4. Create second user and log in (different user)
  const userBConnection: api.IConnection = { host: connection.host };
  const userB = await api.functional.todoApp.auth.user.join(userBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password456",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(userB);
  // 5. User B attempts to restore User A's deleted todo (should be denied)
  await TestValidator.error(
    "access denied when restoring other user's trash",
    async () => {
      await api.functional.todoApp.user.trash.restore(userBConnection, {
        trashId: (todo as ITodoAppTodo & IEntity).id,
      });
    },
  );
}
