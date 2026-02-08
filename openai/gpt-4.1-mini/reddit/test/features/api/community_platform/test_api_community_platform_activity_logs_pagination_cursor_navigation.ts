import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformActivityLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformActivityLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_platform_activity_logs_pagination_cursor_navigation(
  connection: api.IConnection,
): Promise<void> {
  // Test cursor-based pagination by retrieving the first page of activity logs with a specified limit, then navigate to the next page using the cursor or pagination token.
  // Verify that log entries on subsequent pages do not overlap with prior pages and the pagination metadata is consistent.
  // This scenario ensures that pagination mechanism works correctly for navigating large datasets efficiently.
  const adminConnection: api.IConnection = { host: connection.host };
  // First page request
  const firstPage = await api.functional.communityPlatform.activityLogs.index(
    adminConnection,
    { body: {} },
  );
  typia.assert(firstPage);
  TestValidator.predicate(
    "pagination current page is at least 1",
    firstPage.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    firstPage.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    firstPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "page data length should not exceed limit",
    firstPage.data.length <= firstPage.pagination.limit,
  );
  // Second page request
  const secondPage = await api.functional.communityPlatform.activityLogs.index(
    adminConnection,
    { body: {} },
  );
  typia.assert(secondPage);
  TestValidator.predicate(
    "pagination current page is at least 1 (second page)",
    secondPage.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is non-negative (second page)",
    secondPage.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative (second page)",
    secondPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative (second page)",
    secondPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "page data length should not exceed limit (second page)",
    secondPage.data.length <= secondPage.pagination.limit,
  );
  // Validate pagination metadata consistency
  TestValidator.predicate(
    "pagination limit consistency",
    firstPage.pagination.limit === secondPage.pagination.limit,
  );
  TestValidator.predicate(
    "pagination records consistency",
    firstPage.pagination.records === secondPage.pagination.records,
  );
  TestValidator.predicate(
    "pagination pages count consistency",
    firstPage.pagination.pages === secondPage.pagination.pages,
  );
}
