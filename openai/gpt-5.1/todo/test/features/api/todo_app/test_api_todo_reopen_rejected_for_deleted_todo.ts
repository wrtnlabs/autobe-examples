import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

/**
 * Ensure that a logically deleted todo cannot be reopened by its owner.
 *
 * Business flow covered by this test:
 *
 * 1. Register a new member user (POST /auth/memberUser/join) and obtain an
 *    authorized context.
 * 2. Create a new todo for that member (POST /todoApp/memberUser/todos).
 * 3. Complete the todo (POST /todoApp/memberUser/todos/{todoId}/complete).
 * 4. Logically delete the completed todo (DELETE
 *    /todoApp/memberUser/todos/{todoId}).
 * 5. Attempt to reopen the deleted todo (POST
 *    /todoApp/memberUser/todos/{todoId}/reopen).
 *
 * Expected result: the reopen attempt must fail with a domain/business error
 * and must not resurrect the deleted todo into an active state.
 */
export async function test_api_todo_reopen_rejected_for_deleted_todo(
  connection: api.IConnection,
) {
  // 1. Register a new member user and obtain authorized context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserJoin.IRequest;

  const authorized: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2. Create a new todo for that member user
  const createBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ITodoAppTodo.ICreate;

  const createdTodo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: createBody,
    });
  typia.assert(createdTodo);

  TestValidator.equals(
    "created todo should belong to joined member user",
    createdTodo.memberUser.id,
    authorized.id,
  );
  TestValidator.equals(
    "created todo should not be soft-deleted initially",
    createdTodo.deleted_at,
    null,
  );

  // 3. Complete the todo
  const completedTodo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.complete(connection, {
      todoId: createdTodo.id,
    });
  typia.assert(completedTodo);

  TestValidator.equals(
    "completed todo id should match original",
    completedTodo.id,
    createdTodo.id,
  );

  TestValidator.predicate(
    "completed_at should be set after completing the todo",
    completedTodo.completed_at !== null &&
      completedTodo.completed_at !== undefined,
  );

  TestValidator.equals(
    "deleted_at should still be null after completion",
    completedTodo.deleted_at,
    null,
  );

  // 4. Logically delete the completed todo
  const deletedTodo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.erase(connection, {
      todoId: createdTodo.id,
    });
  typia.assert(deletedTodo);

  TestValidator.equals(
    "deleted todo id should match original",
    deletedTodo.id,
    createdTodo.id,
  );

  TestValidator.predicate(
    "deleted_at should be set after logical delete",
    deletedTodo.deleted_at !== null && deletedTodo.deleted_at !== undefined,
  );

  // 5. Attempt to reopen the deleted todo and expect a business error
  await TestValidator.error(
    "cannot reopen a logically deleted todo",
    async () => {
      await api.functional.todoApp.memberUser.todos.reopen(connection, {
        todoId: createdTodo.id,
      });
    },
  );
}
