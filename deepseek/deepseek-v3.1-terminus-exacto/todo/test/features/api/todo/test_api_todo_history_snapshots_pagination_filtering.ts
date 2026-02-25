import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodoHistorySnapshotItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoHistorySnapshotItem";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoHistorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistorySnapshot";
import type { ITodoAppTodoHistorySnapshotItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistorySnapshotItem";
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

export async function test_api_todo_history_snapshots_pagination_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate user
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {});
  typia.assert(user);
  // 2. Create initial todo
  const todo = await generate_random_todo_app_user_todos_create(
    userConnection,
    {
      body: { title: RandomGenerator.paragraph({ sentences: 2 }) },
    },
  );
  typia.assert(todo);
  // 3. Perform multiple updates to create history snapshots
  const updates = ArrayUtil.repeat(5, (index) => ({
    title: `Updated Title ${index + 1}`,
    description:
      index % 2 === 0 ? RandomGenerator.paragraph({ sentences: 3 }) : null,
    start_date: index > 0 ? new Date().toISOString() : null,
    due_date: index > 1 ? new Date(Date.now() + 86400000).toISOString() : null,
  }));
  const editTimestamps: string[] = [];
  for (const update of updates) {
    // Small delay to ensure distinct timestamps
    await new Promise((resolve) => setTimeout(resolve, 10));
    const updated = await api.functional.todoApp.user.todos.update(
      userConnection,
      {
        todoId: todo.id,
        body: update satisfies ITodoAppTodo.IUpdate,
      },
    );
    typia.assert(updated);
    editTimestamps.push(new Date().toISOString());
  }
  // 4. Test basic pagination (limit = 2)
  const page1 = await api.functional.todoApp.user.todos.history.snapshots.index(
    userConnection,
    {
      todoId: todo.id,
      body: {
        page: 1,
        limit: 2,
      } satisfies ITodoAppTodoHistorySnapshotItem.IRequest,
    },
  );
  typia.assert(page1);
  // Validate pagination metadata
  TestValidator.equals("page1 current page", page1.pagination.current, 1);
  TestValidator.equals("page1 limit", page1.pagination.limit, 2);
  TestValidator.equals("page1 total records", page1.pagination.records, 6); // 1 create + 5 updates
  TestValidator.equals("page1 total pages", page1.pagination.pages, 3); // ceil(6/2)=3
  TestValidator.equals("page1 data length", page1.data.length, 2);
  // 5. Test second page
  const page2 = await api.functional.todoApp.user.todos.history.snapshots.index(
    userConnection,
    {
      todoId: todo.id,
      body: {
        page: 2,
        limit: 2,
      } satisfies ITodoAppTodoHistorySnapshotItem.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.equals("page2 current page", page2.pagination.current, 2);
  TestValidator.equals("page2 data length", page2.data.length, 2);
  // 6. Test third page (last)
  const page3 = await api.functional.todoApp.user.todos.history.snapshots.index(
    userConnection,
    {
      todoId: todo.id,
      body: {
        page: 3,
        limit: 2,
      } satisfies ITodoAppTodoHistorySnapshotItem.IRequest,
    },
  );
  typia.assert(page3);
  TestValidator.equals("page3 current page", page3.pagination.current, 3);
  TestValidator.equals("page3 data length", page3.data.length, 2);
  // 7. Test chronological order (newest first)
  const allSnapshots = [...page1.data, ...page2.data, ...page3.data];
  for (let i = 0; i < allSnapshots.length - 1; i++) {
    const current = new Date(allSnapshots[i].snapshot.snapshot_created_at);
    const next = new Date(allSnapshots[i + 1].snapshot.snapshot_created_at);
    TestValidator.predicate(
      `snapshot ${i} is newer than ${i + 1}`,
      current >= next,
    );
  }
  // 8. Test date range filtering
  if (editTimestamps.length >= 3) {
    const midTimestamp = editTimestamps[2];
    const filtered =
      await api.functional.todoApp.user.todos.history.snapshots.index(
        userConnection,
        {
          todoId: todo.id,
          body: {
            from_date: midTimestamp,
            limit: 10,
          } satisfies ITodoAppTodoHistorySnapshotItem.IRequest,
        },
      );
    typia.assert(filtered);
    // Should get snapshots from midTimestamp onward
    TestValidator.predicate("filtered results exist", filtered.data.length > 0);
    // All filtered snapshots should be >= from_date
    for (const item of filtered.data) {
      const itemDate = new Date(item.snapshot.snapshot_created_at);
      const fromDate = new Date(midTimestamp);
      TestValidator.predicate("item date >= from_date", itemDate >= fromDate);
    }
  }
  // 9. Test empty page (page beyond data)
  const emptyPage =
    await api.functional.todoApp.user.todos.history.snapshots.index(
      userConnection,
      {
        todoId: todo.id,
        body: {
          page: 10,
          limit: 2,
        } satisfies ITodoAppTodoHistorySnapshotItem.IRequest,
      },
    );
  typia.assert(emptyPage);
  TestValidator.equals("empty page current", emptyPage.pagination.current, 10);
  TestValidator.equals("empty page data length", emptyPage.data.length, 0);
  // 10. Test default pagination (no page/limit specified)
  const defaultPage =
    await api.functional.todoApp.user.todos.history.snapshots.index(
      userConnection,
      {
        todoId: todo.id,
        body: {} satisfies ITodoAppTodoHistorySnapshotItem.IRequest,
      },
    );
  typia.assert(defaultPage);
  TestValidator.predicate("default page has data", defaultPage.data.length > 0);
}
