import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

export async function test_api_todo_delete_idempotent_or_not_found_after_deletion(
  connection: api.IConnection,
) {
  // 1. Register a new member user and obtain authenticated context.
  const joinRequestBody = typia.random<ITodoAppMemberUserJoin.IRequest>();

  const authorized: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinRequestBody,
    });
  typia.assert(authorized);

  // 2. Create a todo owned by this authenticated member user.
  const createBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ITodoAppTodo.ICreate;

  const created: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: createBody,
    });
  typia.assert(created);

  // Validate that the created todo is owned by the joined member user.
  TestValidator.equals(
    "created todo owned by joined member user",
    created.memberUser.id,
    authorized.id,
  );

  // 3. First deletion: delete the todo by its id.
  const firstDelete: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.erase(connection, {
      todoId: created.id,
    });
  typia.assert(firstDelete);

  // Ensure the deleted todo matches the one we created and is owned by the same user.
  TestValidator.equals(
    "deleted todo id matches created todo id",
    firstDelete.id,
    created.id,
  );
  TestValidator.equals(
    "deleted todo owner matches joined member user",
    firstDelete.memberUser.id,
    authorized.id,
  );

  // 4. Second deletion: attempting to delete the same todo again should now fail.
  await TestValidator.error(
    "second deletion of same todo must fail after first delete",
    async () => {
      await api.functional.todoApp.memberUser.todos.erase(connection, {
        todoId: created.id,
      });
    },
  );
}
