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
import { generate_random_todo_app_user_trash_post } from "../../../generate/generate_random_todo_app_user_trash_post";
import { prepare_random_todo_app_trash_item } from "../../../prepare/prepare_random_todo_app_trash_item";

export async function test_api_trash_filtering_by_restoration_status(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection
  const userConnection: api.IConnection = { host: connection.host };
  // Register and authenticate user
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);
  // Create multiple todos for testing
  // Since the todo creation API returns void, we need to generate UUIDs for our test
  const todoIds = ArrayUtil.repeat(5, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );
  // Create todos
  await ArrayUtil.asyncRepeat(5, async () => {
    await api.functional.todoApp.user.todos.create(userConnection);
  });
  // Delete all todos to move them to trash
  await ArrayUtil.asyncRepeat(5, async (index) => {
    await api.functional.todoApp.user.todos.erase(userConnection, {
      todoId: todoIds[index],
    });
  });
  // Restore some of the trash items using utility function
  const restoredIndices = [0, 2, 4]; // Restore first, third, and fifth items
  const restoredItems = await ArrayUtil.asyncRepeat(
    restoredIndices.length,
    async (index) => {
      const restoredItem = await generate_random_todo_app_user_trash_post(
        userConnection,
        {
          body: {
            todo_app_todo_id: todoIds[restoredIndices[index]],
          } satisfies ITodoAppTrashItem.ICreate,
        },
      );
      typia.assert(restoredItem);
      return restoredItem;
    },
  );
  // Test 1: Filter with include_restored=false (only active trash items)
  const activeTrashResponse = await api.functional.todoApp.user.trash.patch(
    userConnection,
    {
      body: {
        include_restored: false,
        include_permanent_deleted: false,
        page: 1,
        limit: 10,
      } satisfies ITodoAppTrashItem.IRequest,
    },
  );
  typia.assert(activeTrashResponse);
  // Verify only non-restored items are returned
  TestValidator.equals(
    "active trash count should match non-restored items",
    activeTrashResponse.data.length,
    5 - restoredIndices.length,
  );
  // All returned items should have restored_at as null
  activeTrashResponse.data.forEach((item, index) => {
    TestValidator.equals(
      `item ${index} should not be restored`,
      item.restored_at,
      null,
    );
  });
  // Test 2: Filter with include_restored=true (all items including restored)
  const allTrashResponse = await api.functional.todoApp.user.trash.patch(
    userConnection,
    {
      body: {
        include_restored: true,
        include_permanent_deleted: false,
        page: 1,
        limit: 10,
      } satisfies ITodoAppTrashItem.IRequest,
    },
  );
  typia.assert(allTrashResponse);
  // Verify all items are returned
  TestValidator.equals(
    "all trash count should match total deleted items",
    allTrashResponse.data.length,
    5,
  );
  // Verify restored items have restoration timestamps
  const restoredItemIds = new Set(restoredItems.map((item) => item.todo.id));
  allTrashResponse.data.forEach((item) => {
    if (restoredItemIds.has(item.todo.id)) {
      TestValidator.predicate(
        `restored item ${item.todo.id} should have restoration timestamp`,
        item.restored_at !== null,
      );
    } else {
      TestValidator.equals(
        `non-restored item ${item.todo.id} should not have restoration timestamp`,
        item.restored_at,
        null,
      );
    }
  });
  // Test pagination metadata
  TestValidator.equals(
    "pagination current page",
    allTrashResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    allTrashResponse.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pagination total records",
    allTrashResponse.pagination.records,
    5,
  );
}
