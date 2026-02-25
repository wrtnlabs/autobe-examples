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

export async function test_api_trash_permanent_deletion_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create user account and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);
  // Step 2: Create a todo item
  const todo = await generate_random_todo_app_user_todos_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // Step 3: Soft delete the todo
  await api.functional.todoApp.user.todos.erase(userConnection, {
    todoId: todo.id,
  });
  // Step 4: Verify the todo appears in trash
  const trashList = await api.functional.todoApp.user.todos.trash.index(
    userConnection,
    {
      body: {
        page: 1,
        limit: 10,
        restored_at: null,
      } satisfies ITodoAppTrashItem.IRequest,
    },
  );
  typia.assert(trashList);
  const trashItem = trashList.data.find((item) => item.todo.id === todo.id);
  TestValidator.predicate("todo should be in trash", trashItem !== undefined);
  
  // Add null check before accessing trashItem properties
  if (trashItem === undefined) {
    throw new Error("Trash item not found after deletion");
  }
  
  TestValidator.predicate(
    "trash item should not be restored",
    trashItem.restored_at === null,
  );
  TestValidator.predicate(
    "trash item should not be permanently deleted",
    trashItem.permanently_deleted_at === null,
  );
  // Step 5: Permanently delete the trash item
  await api.functional.todoApp.user.todos.trash.permanent_delete.erase(
    userConnection,
    {
      trashItemId: trashItem.id,
    },
  );
  // Step 6: Verify permanent deletion was successful
  // Check that the permanently deleted item appears in the deleted trash list
  const deletedTrashList = await api.functional.todoApp.user.todos.trash.index(
    userConnection,
    {
      body: {
        page: 1,
        limit: 10,
        restored_at: null,
      } satisfies ITodoAppTrashItem.IRequest,
    },
  );
  typia.assert(deletedTrashList);
  // The permanently deleted item should no longer appear in the active trash list
  const remainingTrashItem = deletedTrashList.data.find(
    (item) => item.todo.id === todo.id,
  );
  TestValidator.predicate(
    "trash item should be removed from active trash",
    remainingTrashItem === undefined,
  );
  // Verify that attempting to permanently delete the same item again fails
  await TestValidator.httpError(
    "should not permanently delete already deleted item",
    404,
    async () => {
      await api.functional.todoApp.user.todos.trash.permanent_delete.erase(
        userConnection,
        {
          trashItemId: trashItem!.id,
        },
      );
    },
  );
  // Verify that the todo still exists in the permanently deleted state query
  const allTrashList = await api.functional.todoApp.user.todos.trash.index(
    userConnection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies ITodoAppTrashItem.IRequest,
    },
  );
  typia.assert(allTrashList);
  const permanentlyDeletedItem = allTrashList.data.find(
    (item) => item.todo.id === todo.id,
  );
  
  // Add null check before accessing permanentlyDeletedItem properties
  if (permanentlyDeletedItem === undefined) {
    throw new Error("Permanently deleted item not found");
  }
  
  TestValidator.predicate(
    "todo should exist in complete trash list",
    permanentlyDeletedItem !== undefined,
  );
  TestValidator.predicate(
    "todo should have permanent deletion timestamp",
    permanentlyDeletedItem.permanently_deleted_at !== null,
  );
}