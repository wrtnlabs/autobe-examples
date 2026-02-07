import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSystemActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemActivity";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSystemActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSystemActivity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_system_activities_complex_query_validation(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Test 1: Basic query with default parameters
  const basicResult =
    await api.functional.discussionBoard.admin.system_activities.index(
      adminConnection,
      {
        body: {} satisfies IDiscussionBoardSystemActivity.IRequest,
      },
    );
  typia.assert(basicResult);
  TestValidator.predicate(
    "basic query returns pagination data",
    basicResult.pagination !== undefined,
  );
  // Test 2: Query with date range
  const startDate = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 7 days ago
  const endDate = new Date().toISOString();
  const dateRangeResult =
    await api.functional.discussionBoard.admin.system_activities.index(
      adminConnection,
      {
        body: {
          start_date: startDate,
          end_date: endDate,
        } satisfies IDiscussionBoardSystemActivity.IRequest,
      },
    );
  typia.assert(dateRangeResult);
  // Test 3: Query with grouping by different time periods
  const groupingTests = ["daily", "weekly", "monthly"] as const;
  for (const groupBy of groupingTests) {
    const groupedResult =
      await api.functional.discussionBoard.admin.system_activities.index(
        adminConnection,
        {
          body: {
            group_by: groupBy,
          } satisfies IDiscussionBoardSystemActivity.IRequest,
        },
      );
    typia.assert(groupedResult);
    TestValidator.predicate(
      `${groupBy} grouping returns valid data`,
      Array.isArray(groupedResult.data),
    );
  }
  // Test 4: Complex query combining multiple filters
  const complexResult =
    await api.functional.discussionBoard.admin.system_activities.index(
      adminConnection,
      {
        body: {
          start_date: startDate,
          end_date: endDate,
          group_by: "daily",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSystemActivity.IRequest,
      },
    );
  typia.assert(complexResult);
  // Validate pagination structure
  TestValidator.equals(
    "pagination has current page",
    complexResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    complexResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has valid records count",
    complexResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has valid pages count",
    complexResult.pagination.pages >= 0,
  );
  // Test 5: Query with different pagination settings
  const paginationTests = [
    { page: 1, limit: 5 },
    { page: 2, limit: 10 },
    { page: 1, limit: 20 },
  ];
  for (const pagination of paginationTests) {
    const paginationResult =
      await api.functional.discussionBoard.admin.system_activities.index(
        adminConnection,
        {
          body: {
            page: pagination.page,
            limit: pagination.limit,
          } satisfies IDiscussionBoardSystemActivity.IRequest,
        },
      );
    typia.assert(paginationResult);
    // Validate that data array length does not exceed limit
    TestValidator.predicate(
      `page ${pagination.page} with limit ${pagination.limit} respects pagination`,
      paginationResult.data.length <= pagination.limit,
    );
  }
  // Test 6: Empty result scenario with future date range
  const futureStartDate = new Date(
    Date.now() + 24 * 60 * 60 * 1000,
  ).toISOString(); // Tomorrow
  const futureEndDate = new Date(
    Date.now() + 2 * 24 * 60 * 60 * 1000,
  ).toISOString(); // Day after tomorrow
  const futureResult =
    await api.functional.discussionBoard.admin.system_activities.index(
      adminConnection,
      {
        body: {
          start_date: futureStartDate,
          end_date: futureEndDate,
        } satisfies IDiscussionBoardSystemActivity.IRequest,
      },
    );
  typia.assert(futureResult);
  TestValidator.predicate(
    "future date range returns valid pagination",
    futureResult.pagination.records >= 0,
  );
  // Test 7: Boundary condition - maximum limit
  const maxLimitResult =
    await api.functional.discussionBoard.admin.system_activities.index(
      adminConnection,
      {
        body: {
          limit: 100, // Maximum allowed limit
        } satisfies IDiscussionBoardSystemActivity.IRequest,
      },
    );
  typia.assert(maxLimitResult);
  TestValidator.predicate(
    "maximum limit query succeeds",
    maxLimitResult.pagination.limit === 100,
  );
}
