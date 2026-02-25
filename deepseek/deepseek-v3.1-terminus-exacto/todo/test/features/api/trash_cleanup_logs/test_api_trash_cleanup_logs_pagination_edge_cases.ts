import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTrashCleanupLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTrashCleanupLog";
import type { ITodoAppTrashCleanupLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTrashCleanupLog";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_trash_cleanup_logs_pagination_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated user connection
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppUser.IJoin,
  });
  // Test 1: Page beyond available data (page 1000 with limit 5)
  const beyondPageResponse =
    await api.functional.todoApp.user.todos.trash.cleanup_logs.index(
      userConnection,
      {
        body: {
          page: 1000,
          limit: 5,
        } satisfies ITodoAppTrashCleanupLog.IRequest,
      },
    );
  typia.assert(beyondPageResponse);
  // Should return empty data array when page is beyond available records
  TestValidator.equals(
    "empty data for page beyond records",
    beyondPageResponse.data,
    [],
  );
  // Test 2: Minimum page size (limit=1)
  const minLimitResponse =
    await api.functional.todoApp.user.todos.trash.cleanup_logs.index(
      userConnection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies ITodoAppTrashCleanupLog.IRequest,
      },
    );
  typia.assert(minLimitResponse);
  // Test 3: Maximum page size (limit=100)
  const maxLimitResponse =
    await api.functional.todoApp.user.todos.trash.cleanup_logs.index(
      userConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies ITodoAppTrashCleanupLog.IRequest,
      },
    );
  typia.assert(maxLimitResponse);
  // Test 4: Null date filter parameters
  const nullDatesResponse =
    await api.functional.todoApp.user.todos.trash.cleanup_logs.index(
      userConnection,
      {
        body: {
          started_at_from: null,
          started_at_to: null,
          completed_at_from: null,
          completed_at_to: null,
          page: 1,
          limit: 10,
        } satisfies ITodoAppTrashCleanupLog.IRequest,
      },
    );
  typia.assert(nullDatesResponse);
  // Test 5: Ascending sort order
  const ascendingResponse =
    await api.functional.todoApp.user.todos.trash.cleanup_logs.index(
      userConnection,
      {
        body: {
          sort: "started_at_asc",
          page: 1,
          limit: 10,
        } satisfies ITodoAppTrashCleanupLog.IRequest,
      },
    );
  typia.assert(ascendingResponse);
  // Test 6: Descending sort order
  const descendingResponse =
    await api.functional.todoApp.user.todos.trash.cleanup_logs.index(
      userConnection,
      {
        body: {
          sort: "started_at_desc",
          page: 1,
          limit: 10,
        } satisfies ITodoAppTrashCleanupLog.IRequest,
      },
    );
  typia.assert(descendingResponse);
  // Test 7: Operation status filtering
  const statusResponse =
    await api.functional.todoApp.user.todos.trash.cleanup_logs.index(
      userConnection,
      {
        body: {
          operation_status: "completed",
          page: 1,
          limit: 10,
        } satisfies ITodoAppTrashCleanupLog.IRequest,
      },
    );
  typia.assert(statusResponse);
}
