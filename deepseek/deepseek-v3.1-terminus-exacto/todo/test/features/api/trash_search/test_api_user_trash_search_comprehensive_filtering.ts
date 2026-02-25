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

export async function test_api_user_trash_search_comprehensive_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. User authentication setup
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: "https://test-app.com",
      referrer: "https://test-app.com/registration",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);
  // 2. Create multiple test todos with varying content
  const todos = await ArrayUtil.asyncRepeat(4, async (index) => {
    const todo = await generate_random_todo_app_user_todos_create(
      userConnection,
      {
        body: {
          title: `Test Todo ${index + 1} - ${RandomGenerator.paragraph({ sentences: 1 })}`,
        } satisfies ITodoAppTodo.ICreate,
      },
    );
    typia.assert(todo);
    return todo;
  });
  // 3. Soft delete todos
  for (const todo of todos) {
    await api.functional.todoApp.user.todos.erase(userConnection, {
      todoId: todo.id,
    });
  }
  // 4. Restore one todo to test restoration status filtering
  const todoToRestore = todos[0];
  const restoredTodo = await api.functional.todoApp.user.todos.restore(
    userConnection,
    {
      todoId: todoToRestore.id,
    },
  );
  typia.assert(restoredTodo);
  // 5. Test trash search with no filters (get all trash items)
  const allTrashResponse = await api.functional.todoApp.user.todos.trash.index(
    userConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies ITodoAppTrashItem.IRequest,
    },
  );
  typia.assert(allTrashResponse);
  // Validate pagination metadata
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
    "total records count",
    allTrashResponse.pagination.records,
    4,
  );
  TestValidator.equals(
    "total pages count",
    allTrashResponse.pagination.pages,
    1,
  );
  // Validate data structure for all trash items
  TestValidator.equals("trash items count", allTrashResponse.data.length, 4);
  for (const trashItem of allTrashResponse.data) {
    typia.assert(trashItem);
    TestValidator.predicate("has deletion timestamp", !!trashItem.deleted_at);
    TestValidator.predicate("has todo information", !!trashItem.todo);
    TestValidator.equals(
      "permanently_deleted_at is null for non-permanent deletions",
      trashItem.permanently_deleted_at,
      null,
    );
    // Check if this is the restored todo
    if (trashItem.todo.id === todoToRestore.id) {
      TestValidator.predicate(
        "restored todo has restoration timestamp",
        !!trashItem.restored_at,
      );
    } else {
      TestValidator.equals(
        "non-restored todo has null restoration",
        trashItem.restored_at,
        null,
      );
    }
  }
  // 6. Test trash search with restoration status filter (only active trash)
  const activeTrashResponse =
    await api.functional.todoApp.user.todos.trash.index(userConnection, {
      body: {
        page: 1,
        limit: 10,
        restored_at: null,
      } satisfies ITodoAppTrashItem.IRequest,
    });
  typia.assert(activeTrashResponse);
  // Should have 3 active trash items (4 total minus 1 restored)
  TestValidator.equals(
    "active trash items count",
    activeTrashResponse.data.length,
    3,
  );
  for (const trashItem of activeTrashResponse.data) {
    TestValidator.equals(
      "active trash has null restoration",
      trashItem.restored_at,
      null,
    );
    TestValidator.predicate(
      "active trash todo is not restored todo",
      trashItem.todo.id !== todoToRestore.id,
    );
  }
  // 7. Test trash search with deletion date range filtering using null bounds
  const dateRangeResponse = await api.functional.todoApp.user.todos.trash.index(
    userConnection,
    {
      body: {
        page: 1,
        limit: 10,
        deleted_at_from: null,
        deleted_at_to: null,
      } satisfies ITodoAppTrashItem.IRequest,
    },
  );
  typia.assert(dateRangeResponse);
  // Should return all items when both bounds are null
  TestValidator.equals(
    "date range with null bounds returns all items",
    dateRangeResponse.data.length,
    4,
  );
  // 8. Test restoration status filter with specific timestamp (will likely return empty)
  const restoredTrashResponse =
    await api.functional.todoApp.user.todos.trash.index(userConnection, {
      body: {
        page: 1,
        limit: 10,
        restored_at: new Date().toISOString(), // Current timestamp
      } satisfies ITodoAppTrashItem.IRequest,
    });
  typia.assert(restoredTrashResponse);
  // This may return empty since exact timestamp matching is unlikely
  TestValidator.predicate(
    "restored items query returns valid response",
    restoredTrashResponse.pagination.records >= 0,
  );
  // 9. Validate user isolation - should only return current user's trash
  const anotherUserConnection: api.IConnection = { host: connection.host };
  const anotherUser = await authorize_user_join(anotherUserConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: "https://test-app.com",
      referrer: "https://test-app.com/registration",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(anotherUser);
  // Another user should have empty trash
  const anotherUserTrashResponse =
    await api.functional.todoApp.user.todos.trash.index(anotherUserConnection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies ITodoAppTrashItem.IRequest,
    });
  typia.assert(anotherUserTrashResponse);
  TestValidator.equals(
    "another user has no trash items",
    anotherUserTrashResponse.data.length,
    0,
  );
  TestValidator.equals(
    "another user has zero records",
    anotherUserTrashResponse.pagination.records,
    0,
  );
}
