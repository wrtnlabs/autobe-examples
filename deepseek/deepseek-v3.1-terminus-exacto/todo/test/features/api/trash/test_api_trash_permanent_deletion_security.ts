import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTrashItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTrashItem";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTrashItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTrashItem";
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

export async function test_api_trash_permanent_deletion_security(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup first user
  const firstUserConnection: api.IConnection = { host: connection.host };
  const firstUserAuth = await authorize_user_join(firstUserConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(firstUserAuth);
  firstUserConnection.headers = { Authorization: firstUserAuth.token.access };
  // 2. First user creates a todo
  const todo = await generate_random_todo_app_user_todos_create(
    firstUserConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(todo);
  // 3. First user soft-deletes the todo
  await api.functional.todoApp.user.todos.erase(firstUserConnection, {
    todoId: todo.id,
  });
  // 4. Verify todo appears in first user's trash
  const trashResponse = await api.functional.todoApp.user.todos.trash.index(
    firstUserConnection,
    {
      body: {
        limit: 10,
        page: 1,
        restored_at: null,
      } satisfies ITodoAppTrashItem.IRequest,
    },
  );
  typia.assert(trashResponse);
  TestValidator.predicate(
    "todo should be in trash",
    trashResponse.data.some((item) => item.todo.id === todo.id),
  );
  const trashItem = trashResponse.data.find((item) => item.todo.id === todo.id);
  TestValidator.predicate("trash item found", trashItem !== undefined);
  // 5. Setup second user
  const secondUserConnection: api.IConnection = { host: connection.host };
  const secondUserAuth = await authorize_user_join(secondUserConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(secondUserAuth);
  secondUserConnection.headers = {
    Authorization: secondUserAuth.token.access,
  };
  // 6. Second user attempts to permanently delete first user's trash item
  //    This should fail with 403 Forbidden
  await TestValidator.httpError(
    "second user cannot delete another user's trash",
    403,
    async () => {
      await api.functional.todoApp.user.todos.trash.permanent_delete.erase(
        secondUserConnection,
        {
          trashItemId: trashItem!.id,
        },
      );
    },
  );
  // 7. Verify first user's trash item remains accessible
  const verifyTrash = await api.functional.todoApp.user.todos.trash.index(
    firstUserConnection,
    {
      body: {
        limit: 10,
        page: 1,
        restored_at: null,
      } satisfies ITodoAppTrashItem.IRequest,
    },
  );
  typia.assert(verifyTrash);
  TestValidator.predicate(
    "first user's trash item should still exist",
    verifyTrash.data.some((item) => item.id === trashItem!.id),
  );
  // 8. Verify data isolation - second user should have empty trash
  const secondUserTrash = await api.functional.todoApp.user.todos.trash.index(
    secondUserConnection,
    {
      body: {
        limit: 10,
        page: 1,
        restored_at: null,
      } satisfies ITodoAppTrashItem.IRequest,
    },
  );
  typia.assert(secondUserTrash);
  TestValidator.equals(
    "second user should have empty trash",
    secondUserTrash.data.length,
    0,
  );
}
