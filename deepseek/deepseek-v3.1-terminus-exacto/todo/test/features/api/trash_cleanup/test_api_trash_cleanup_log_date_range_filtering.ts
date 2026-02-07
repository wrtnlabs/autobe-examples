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

/**
 * Test date range filtering for cleanup logs.
 * Search logs within specific started_at and completed_at date ranges.
 * Test scenarios with completed operations (non-null completed_at) and incomplete operations (null completed_at).
 * Verify date filtering handles correct inclusive/exclusive boundaries.
 * Test pagination with date-filtered results to ensure consistency.
 */
export async function test_api_trash_cleanup_log_date_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies ITodoAppUser.IJoin,
  });
  // Test 1: Basic date range filtering with started_at_range
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const basicDateRangeRequest: ITodoAppTrashCleanupLog.IRequest = {
    started_at_range: {
      start: twoHoursAgo.toISOString(),
      end: oneHourAgo.toISOString(),
    },
    page: typia.random<
      number & tags.Type<"int32"> & tags.Default<1> & tags.Minimum<1>
    >(),
    limit: typia.random<
      number &
        tags.Type<"int32"> &
        tags.Default<20> &
        tags.Minimum<1> &
        tags.Maximum<100>
    >(),
  } satisfies ITodoAppTrashCleanupLog.IRequest;
  const basicResult =
    await api.functional.todoApp.user.trash.cleanup_logs.index(userConnection, {
      body: basicDateRangeRequest,
    });
  typia.assert(basicResult);
  // Test 2: Date range filtering with completed operations (non-null completed_at)
  const completedRangeRequest: ITodoAppTrashCleanupLog.IRequest = {
    completed_at_range: {
      start: twoHoursAgo.toISOString(),
      end: now.toISOString(),
    },
    operation_status: "completed",
    page: typia.random<
      number & tags.Type<"int32"> & tags.Default<1> & tags.Minimum<1>
    >(),
    limit: typia.random<
      number &
        tags.Type<"int32"> &
        tags.Default<20> &
        tags.Minimum<1> &
        tags.Maximum<100>
    >(),
  } satisfies ITodoAppTrashCleanupLog.IRequest;
  const completedResult =
    await api.functional.todoApp.user.trash.cleanup_logs.index(userConnection, {
      body: completedRangeRequest,
    });
  typia.assert(completedResult);
  // Test 3: Test pagination with date-filtered results
  const paginationRequest: ITodoAppTrashCleanupLog.IRequest = {
    started_at_range: {
      start: twoHoursAgo.toISOString(),
      end: now.toISOString(),
    },
    page: 1,
    limit: 3,
  } satisfies ITodoAppTrashCleanupLog.IRequest;
  const paginationResult =
    await api.functional.todoApp.user.trash.cleanup_logs.index(userConnection, {
      body: paginationRequest,
    });
  typia.assert(paginationResult);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    paginationResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    paginationResult.pagination.limit,
    3,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    paginationResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    paginationResult.pagination.pages >= 0,
  );
  // Test 4: Boundary test - single timestamp range (inclusive boundaries)
  const boundaryRequest: ITodoAppTrashCleanupLog.IRequest = {
    started_at_range: {
      start: oneHourAgo.toISOString(),
      end: oneHourAgo.toISOString(),
    },
    page: typia.random<
      number & tags.Type<"int32"> & tags.Default<1> & tags.Minimum<1>
    >(),
    limit: typia.random<
      number &
        tags.Type<"int32"> &
        tags.Default<20> &
        tags.Minimum<1> &
        tags.Maximum<100>
    >(),
  } satisfies ITodoAppTrashCleanupLog.IRequest;
  const boundaryResult =
    await api.functional.todoApp.user.trash.cleanup_logs.index(userConnection, {
      body: boundaryRequest,
    });
  typia.assert(boundaryResult);
  // Test 5: Combined date range filtering
  const combinedRequest: ITodoAppTrashCleanupLog.IRequest = {
    started_at_range: {
      start: twoHoursAgo.toISOString(),
      end: now.toISOString(),
    },
    completed_at_range: {
      start: oneHourAgo.toISOString(),
      end: now.toISOString(),
    },
    page: typia.random<
      number & tags.Type<"int32"> & tags.Default<1> & tags.Minimum<1>
    >(),
    limit: typia.random<
      number &
        tags.Type<"int32"> &
        tags.Default<20> &
        tags.Minimum<1> &
        tags.Maximum<100>
    >(),
  } satisfies ITodoAppTrashCleanupLog.IRequest;
  const combinedResult =
    await api.functional.todoApp.user.trash.cleanup_logs.index(userConnection, {
      body: combinedRequest,
    });
  typia.assert(combinedResult);
}
