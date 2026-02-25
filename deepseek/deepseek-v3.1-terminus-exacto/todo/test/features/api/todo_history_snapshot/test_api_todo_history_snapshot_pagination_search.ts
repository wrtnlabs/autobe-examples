import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodoHistorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoHistorySnapshot";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoHistorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistorySnapshot";
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

export async function test_api_todo_history_snapshot_pagination_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create user and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(user);
  // 2. Create a todo
  const todo = await generate_random_todo_app_user_todos_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(todo);
  // 3. We need a historyId to search snapshots. Since no API to create histories/snapshots is provided,
  // we'll test the endpoint structure and pagination metadata with a random historyId.
  // In production, there would be actual history entries from todo edits.
  const historyId = typia.random<string & tags.Format<"uuid">>();
  // 4. Test basic pagination
  const page1 =
    await api.functional.todoApp.user.todos.histories.snapshots.index(
      userConnection,
      {
        todoId: todo.id,
        historyId,
        body: {
          page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies ITodoAppTodoHistorySnapshot.IRequest,
      },
    );
  typia.assert(page1);
  // Validate pagination structure
  TestValidator.equals("pagination current page", page1.pagination.current, 1);
  TestValidator.equals("pagination limit", page1.pagination.limit, 10);
  TestValidator.predicate(
    "records non-negative",
    page1.pagination.records >= 0,
  );
  TestValidator.predicate("pages non-negative", page1.pagination.pages >= 0);
  // Validate each snapshot - typia.assert already validates all properties including types and formats
  for (const snapshot of page1.data) {
    typia.assert(snapshot);
    // NO REDUNDANT TYPE CHECKS - typia.assert() validates everything
  }
  // 5. Test timestamp filtering with search_start and search_end
  if (page1.data.length > 0) {
    // Use the first snapshot's timestamp as reference
    const firstSnapshot = page1.data[0];
    const searchTime = new Date(
      firstSnapshot.snapshot_created_at,
    ).toISOString();
    const filtered =
      await api.functional.todoApp.user.todos.histories.snapshots.index(
        userConnection,
        {
          todoId: todo.id,
          historyId,
          body: {
            search_start: searchTime satisfies
              | (string & tags.Format<"date-time">)
              | null,
            search_end: searchTime satisfies
              | (string & tags.Format<"date-time">)
              | null,
          } satisfies ITodoAppTodoHistorySnapshot.IRequest,
        },
      );
    typia.assert(filtered);
    // Should contain at least the matching snapshot (business logic test, not type test)
    TestValidator.predicate(
      "filtered results include snapshot with matching timestamp",
      filtered.data.some((s) => s.id === firstSnapshot.id),
    );
  }
  // 6. Test ordering - snapshots should be ordered by creation timestamp (business logic)
  for (let i = 1; i < page1.data.length; i++) {
    const prevTime = new Date(page1.data[i - 1].snapshot_created_at).getTime();
    const currTime = new Date(page1.data[i].snapshot_created_at).getTime();
    TestValidator.predicate(
      `snapshot ${i} timestamp >= previous snapshot timestamp`,
      currTime >= prevTime,
    );
  }
}
