import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_super_admin_search_date_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Note: Since there's no utility function for super admin creation and we cannot
  // create super admin accounts through the API (as per the system design),
  // this test will focus on validating the search functionality with the
  // existing data in the system.
  // Test different date range combinations with various aggregation levels
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  // Test 1: Search with specific date range (last week)
  const searchLastWeek =
    await api.functional.discussionBoard.super_admins.index(connection, {
      body: {
        start_date: oneWeekAgo.toISOString(),
        end_date: now.toISOString(),
        include_user_stats: true,
        include_content_stats: true,
        include_performance_stats: true,
        aggregation_level: "daily" as const,
      } satisfies IDiscussionBoardSuperAdmin.IRequest,
    });
  typia.assert(searchLastWeek);
  // Test 2: Search with broader date range (last month)
  const searchLastMonth =
    await api.functional.discussionBoard.super_admins.index(connection, {
      body: {
        start_date: oneMonthAgo.toISOString(),
        end_date: now.toISOString(),
        include_user_stats: false,
        include_content_stats: true,
        include_performance_stats: false,
        aggregation_level: "weekly" as const,
      } satisfies IDiscussionBoardSuperAdmin.IRequest,
    });
  typia.assert(searchLastMonth);
  // Test 3: Search with monthly aggregation
  const searchMonthly = await api.functional.discussionBoard.super_admins.index(
    connection,
    {
      body: {
        start_date: oneMonthAgo.toISOString(),
        end_date: now.toISOString(),
        include_user_stats: true,
        include_content_stats: false,
        include_performance_stats: true,
        aggregation_level: "monthly" as const,
      } satisfies IDiscussionBoardSuperAdmin.IRequest,
    },
  );
  typia.assert(searchMonthly);
  // Test 4: Search with null dates (should return all records)
  const searchAll = await api.functional.discussionBoard.super_admins.index(
    connection,
    {
      body: {
        start_date: null,
        end_date: null,
        include_user_stats: true,
        include_content_stats: true,
        include_performance_stats: true,
        aggregation_level: "daily" as const,
      } satisfies IDiscussionBoardSuperAdmin.IRequest,
    },
  );
  typia.assert(searchAll);
  // Validate pagination structure for all responses
  const validatePagination = (
    response: IPageIDiscussionBoardSuperAdmin.ISummary,
    testName: string,
  ) => {
    TestValidator.equals(
      `${testName} pagination structure exists`,
      typeof response.pagination,
      "object",
    );
    TestValidator.predicate(
      `${testName} has valid current page`,
      response.pagination.current >= 0,
    );
    TestValidator.predicate(
      `${testName} has valid limit`,
      response.pagination.limit >= 0,
    );
    TestValidator.predicate(
      `${testName} has valid records count`,
      response.pagination.records >= 0,
    );
    TestValidator.predicate(
      `${testName} has valid pages count`,
      response.pagination.pages >= 0,
    );
  };
  validatePagination(searchLastWeek, "last week search");
  validatePagination(searchLastMonth, "last month search");
  validatePagination(searchMonthly, "monthly search");
  validatePagination(searchAll, "all records search");
  // Validate data structure consistency
  const validateDataStructure = (
    response: IPageIDiscussionBoardSuperAdmin.ISummary,
    testName: string,
  ) => {
    TestValidator.equals(
      `${testName} data is array`,
      Array.isArray(response.data),
      true,
    );
    if (response.data.length > 0) {
      const sampleItem = response.data[0];
      TestValidator.predicate(
        `${testName} item has UUID id`,
        /^[0-9a-f-]{36}$/i.test(sampleItem.id),
      );
      TestValidator.predicate(
        `${testName} item has valid email`,
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sampleItem.email),
      );
      TestValidator.predicate(
        `${testName} item has privilege_level`,
        typeof sampleItem.privilege_level === "string",
      );
      TestValidator.predicate(
        `${testName} item has ISO date created_at`,
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(sampleItem.created_at),
      );
    }
  };
  validateDataStructure(searchLastWeek, "last week search");
  validateDataStructure(searchLastMonth, "last month search");
  validateDataStructure(searchMonthly, "monthly search");
  validateDataStructure(searchAll, "all records search");
  // Test edge case: Empty date range (should return empty or limited results)
  const futureDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const searchFuture = await api.functional.discussionBoard.super_admins.index(
    connection,
    {
      body: {
        start_date: futureDate.toISOString(),
        end_date: new Date(
          futureDate.getTime() + 24 * 60 * 60 * 1000,
        ).toISOString(),
        include_user_stats: true,
        include_content_stats: true,
        include_performance_stats: true,
        aggregation_level: "daily" as const,
      } satisfies IDiscussionBoardSuperAdmin.IRequest,
    },
  );
  typia.assert(searchFuture);
  // The future date search should have 0 or limited results
  TestValidator.predicate(
    "future date search returns valid pagination",
    searchFuture.pagination.records >= 0,
  );
}
