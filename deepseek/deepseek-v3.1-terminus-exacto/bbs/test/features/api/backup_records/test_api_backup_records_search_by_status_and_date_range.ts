import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBackupRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBackupRecord";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardBackupRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardBackupRecord";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_backup_records_search_by_status_and_date_range(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super administrator using join utility function
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Define date ranges for testing
  const thirtyDaysAgo = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const fifteenDaysAgo = new Date(
    Date.now() - 15 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const currentTime = new Date().toISOString();
  // Additional date calculations for broader test coverage - moved to top
  const fortyDaysAgo = new Date(
    Date.now() - 40 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const twentyDaysAgo = new Date(
    Date.now() - 20 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const tenDaysAgo = new Date(
    Date.now() - 10 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const fiveDaysAgo = new Date(
    Date.now() - 5 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const fortyFiveDaysAgo = new Date(
    Date.now() - 45 * 24 * 60 * 60 * 1000,
  ).toISOString();
  // Test 1: Search for completed backups within date range
  const completedSearchResult =
    await api.functional.discussionBoard.superAdmin.backup_records.operations.index(
      superAdminConnection,
      {
        body: {
          status: "completed",
          started_at_from: thirtyDaysAgo,
          started_at_to: fifteenDaysAgo,
          completed_at_from: twentyDaysAgo,
          completed_at_to: tenDaysAgo,
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
        } satisfies IDiscussionBoardBackupRecord.IRequest,
      },
    );
  typia.assert(completedSearchResult);
  // Validate pagination structure
  TestValidator.equals(
    "pagination structure exists",
    typeof completedSearchResult.pagination,
    "object",
  );
  TestValidator.predicate(
    "has current page",
    completedSearchResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "has valid limit",
    completedSearchResult.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "has records count",
    completedSearchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "has pages count",
    completedSearchResult.pagination.pages >= 0,
  );
  // Test 2: Search for failed backups with status filter only
  const failedSearchResult =
    await api.functional.discussionBoard.superAdmin.backup_records.operations.index(
      superAdminConnection,
      {
        body: {
          status: "failed",
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<50>
          >(),
        } satisfies IDiscussionBoardBackupRecord.IRequest,
      },
    );
  typia.assert(failedSearchResult);
  // Test 3: Search by completed date range without status filter
  const dateRangeSearchResult =
    await api.functional.discussionBoard.superAdmin.backup_records.operations.index(
      superAdminConnection,
      {
        body: {
          completed_at_from: thirtyDaysAgo,
          completed_at_to: currentTime,
          sort: "completed_at",
        } satisfies IDiscussionBoardBackupRecord.IRequest,
      },
    );
  typia.assert(dateRangeSearchResult);
  // Test 4: Search by started date range with backup type filter
  const typeSearchResult =
    await api.functional.discussionBoard.superAdmin.backup_records.operations.index(
      superAdminConnection,
      {
        body: {
          backup_type: "full",
          started_at_from: fortyDaysAgo,
          started_at_to: fiveDaysAgo,
        } satisfies IDiscussionBoardBackupRecord.IRequest,
      },
    );
  typia.assert(typeSearchResult);
  // Test 5: Search with multiple criteria including error search
  const comprehensiveSearchResult =
    await api.functional.discussionBoard.superAdmin.backup_records.operations.index(
      superAdminConnection,
      {
        body: {
          status: "completed",
          backup_type: "incremental",
          started_at_from: fortyFiveDaysAgo,
          completed_at_to: currentTime,
          search: "database",
          sort: "started_at",
        } satisfies IDiscussionBoardBackupRecord.IRequest,
      },
    );
  typia.assert(comprehensiveSearchResult);
  // Validate that different search parameters return different result sets
  TestValidator.notEquals(
    "different search criteria should return different results",
    completedSearchResult.data.length,
    failedSearchResult.data.length,
  );
}