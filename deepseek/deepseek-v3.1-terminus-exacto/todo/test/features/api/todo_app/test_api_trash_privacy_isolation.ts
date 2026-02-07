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

/**
 * Test that users can only access their own trash items and cannot see other users' deleted todos.
 * This scenario validates the privacy and data isolation requirements by creating two separate
 * user accounts, having each user create and delete their own todos, then verifying that each
 * user's trash endpoint only shows their own deleted items.
 */
export async function test_api_trash_privacy_isolation(
  connection: api.IConnection,
): Promise<void> {
  // Create first user
  const user1Connection: api.IConnection = { host: connection.host };
  const user1 = await authorize_user_join(user1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user1);
  // Create second user
  const user2Connection: api.IConnection = { host: connection.host };
  const user2 = await authorize_user_join(user2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user2);
  // User 1 creates and deletes todos
  const user1DeletedIds: string[] = await ArrayUtil.asyncRepeat(3, async () => {
    const createdTodoResponse =
      await api.functional.todoApp.user.todos.create(user1Connection);
    typia.assert(createdTodoResponse);
    const createdTodo = typia.assert<ITodoAppTodo>(createdTodoResponse);
    const deletedTodoResponse = await api.functional.todoApp.user.todos.erase(
      user1Connection,
      {
        todoId: createdTodo.id,
      },
    );
    typia.assert(deletedTodoResponse);
    const deletedTodo = typia.assert<ITodoAppTodo>(deletedTodoResponse);
    return deletedTodo.id;
  });
  // User 2 creates and deletes todos
  const user2DeletedIds: string[] = await ArrayUtil.asyncRepeat(2, async () => {
    const createdTodoResponse =
      await api.functional.todoApp.user.todos.create(user2Connection);
    typia.assert(createdTodoResponse);
    const createdTodo = typia.assert<ITodoAppTodo>(createdTodoResponse);
    const deletedTodoResponse = await api.functional.todoApp.user.todos.erase(
      user2Connection,
      {
        todoId: createdTodo.id,
      },
    );
    typia.assert(deletedTodoResponse);
    const deletedTodo = typia.assert<ITodoAppTodo>(deletedTodoResponse);
    return deletedTodo.id;
  });
  // User 1 checks their trash
  const user1TrashResponse =
    await api.functional.todoApp.user.trash.get(user1Connection);
  typia.assert(user1TrashResponse);
  const user1Trash =
    typia.assert<IPageITodoAppTrashItem.ISummary>(user1TrashResponse);
  // User 2 checks their trash
  const user2TrashResponse =
    await api.functional.todoApp.user.trash.get(user2Connection);
  typia.assert(user2TrashResponse);
  const user2Trash =
    typia.assert<IPageITodoAppTrashItem.ISummary>(user2TrashResponse);
  // Validate trash isolation
  TestValidator.equals(
    "user1 trash count matches deleted todos",
    user1Trash.data.length,
    user1DeletedIds.length,
  );
  TestValidator.equals(
    "user2 trash count matches deleted todos",
    user2Trash.data.length,
    user2DeletedIds.length,
  );
  // Verify user1 can only see their own trash items
  for (const trashItem of user1Trash.data) {
    TestValidator.predicate(
      "user1 trash item belongs to user1",
      user1DeletedIds.includes(trashItem.todo.id),
    );
    TestValidator.predicate(
      "user1 trash item does not belong to user2",
      !user2DeletedIds.includes(trashItem.todo.id),
    );
  }
  // Verify user2 can only see their own trash items
  for (const trashItem of user2Trash.data) {
    TestValidator.predicate(
      "user2 trash item belongs to user2",
      user2DeletedIds.includes(trashItem.todo.id),
    );
    TestValidator.predicate(
      "user2 trash item does not belong to user1",
      !user1DeletedIds.includes(trashItem.todo.id),
    );
  }
  // Validate trash item structure
  for (const trashItem of [...user1Trash.data, ...user2Trash.data]) {
    TestValidator.predicate(
      "trash item has deletion timestamp",
      trashItem.deleted_at !== null && trashItem.deleted_at.length > 0,
    );
    TestValidator.predicate(
      "trash item has todo information",
      trashItem.todo !== null && trashItem.todo.title.length > 0,
    );
    TestValidator.predicate(
      "trash item is not restored",
      trashItem.restored_at === null,
    );
    TestValidator.predicate(
      "trash item is not permanently deleted",
      trashItem.permanently_deleted_at === null,
    );
  }
}
