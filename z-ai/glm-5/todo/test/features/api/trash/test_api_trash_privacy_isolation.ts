import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
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

/**
 * Test that users can only view their own trashed todos and cannot access
 * other users' deleted content. This validates the privacy-first design principle
 * where complete data isolation between users is enforced.
 */
export async function test_api_trash_privacy_isolation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create User A account and authenticate
  const userAConnection: api.IConnection = { host: connection.host };
  const userA = await authorize_user_join(userAConnection, {});
  typia.assert(userA);
  // Step 2: Create a todo as User A with a unique, identifiable title
  const todoA = await generate_random_todo_app_user_todos_create(
    userAConnection,
    {
      body: {
        title: `User A Private Todo ${RandomGenerator.alphaNumeric(8)}`,
      },
    },
  );
  typia.assert(todoA);
  // Step 3: Delete the todo as User A (soft delete to move to trash)
  await api.functional.todoApp.user.todos.erase(userAConnection, {
    todoId: todoA.id,
  });
  // Step 4: Create User B account with different email and authenticate
  const userBConnection: api.IConnection = { host: connection.host };
  const userB = await authorize_user_join(userBConnection, {});
  typia.assert(userB);
  // Step 5: Request trash list as User B
  const userBTrashList = await api.functional.todoApp.user.trash.index(
    userBConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(userBTrashList);
  // Step 6: Verify User B's trash list is empty (no deleted todos)
  TestValidator.equals(
    "User B trash list should be empty",
    userBTrashList.pagination.records,
    0,
  );
  TestValidator.equals(
    "User B trash data should be empty array",
    userBTrashList.data.length,
    0,
  );
  // Step 7: Verify User B cannot see User A's deleted todo
  const userATodoInUserBTrash = userBTrashList.data.find(
    (todo) => todo.id === todoA.id,
  );
  TestValidator.equals(
    "User A's deleted todo should not appear in User B's trash",
    userATodoInUserBTrash,
    undefined,
  );
  // Additional verification: User A can still see their deleted todo in their own trash
  const userATrashList = await api.functional.todoApp.user.trash.index(
    userAConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(userATrashList);
  TestValidator.predicate(
    "User A should have at least one trashed todo",
    userATrashList.pagination.records >= 1,
  );
  const userATodoInTrash = userATrashList.data.find(
    (todo) => todo.id === todoA.id,
  );
  TestValidator.predicate(
    "User A's deleted todo should be in their own trash",
    userATodoInTrash !== undefined,
  );
}
