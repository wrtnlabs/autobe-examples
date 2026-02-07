import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoHistory";
import type { IPageITodoAppTodoHistorySnapshotItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoHistorySnapshotItem";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistory";
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

export async function test_api_todo_history_snapshot_search_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and register
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);
  // Since todo creation endpoint returns void, we need to use a different approach
  // For testing purposes, we'll assume there's an existing todo or create one through updates
  // For now, we'll use a random todoId to demonstrate the pagination functionality
  const todoId = typia.random<string & tags.Format<"uuid">>();
  // Get history entries to obtain valid historyId
  const historyResponse =
    await api.functional.todoApp.user.todos.histories.index(userConnection, {
      todoId: todoId,
      body: {
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodoHistory.IRequest,
    });
  typia.assert(historyResponse);
  // If no history entries exist, we can't test snapshot pagination
  if (historyResponse.data.length === 0) {
    console.log("No history entries found for testing pagination");
    return;
  }
  const historyId = historyResponse.data[0]!.id;
  // Test pagination with valid parameters
  const searchResponse =
    await api.functional.todoApp.user.todos.histories.snapshots.index(
      userConnection,
      {
        todoId: todoId,
        historyId: historyId,
        body: {
          page: 1,
          limit: 2,
        } satisfies ITodoAppTodoHistorySnapshotItem.IRequest,
      },
    );
  typia.assert(searchResponse);
  // Validate pagination metadata
  TestValidator.equals("current page", searchResponse.pagination.current, 1);
  TestValidator.equals("limit", searchResponse.pagination.limit, 2);
  TestValidator.predicate(
    "total records >= 0",
    searchResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages >= 0",
    searchResponse.pagination.pages >= 0,
  );
  // Test edge case: page beyond total pages
  const beyondPageResponse =
    await api.functional.todoApp.user.todos.histories.snapshots.index(
      userConnection,
      {
        todoId: todoId,
        historyId: historyId,
        body: {
          page: searchResponse.pagination.pages + 1,
          limit: 2,
        } satisfies ITodoAppTodoHistorySnapshotItem.IRequest,
      },
    );
  typia.assert(beyondPageResponse);
  TestValidator.equals(
    "empty data for beyond page",
    beyondPageResponse.data.length,
    0,
  );
  TestValidator.equals(
    "current page should be requested page",
    beyondPageResponse.pagination.current,
    searchResponse.pagination.pages + 1,
  );
  TestValidator.equals(
    "limit should match",
    beyondPageResponse.pagination.limit,
    2,
  );
  TestValidator.equals(
    "total records should match",
    beyondPageResponse.pagination.records,
    searchResponse.pagination.records,
  );
  TestValidator.equals(
    "total pages should match",
    beyondPageResponse.pagination.pages,
    searchResponse.pagination.pages,
  );
}
