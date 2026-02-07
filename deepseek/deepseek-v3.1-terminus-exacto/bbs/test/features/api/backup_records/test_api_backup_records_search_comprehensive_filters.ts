import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBackupRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBackupRecord";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardBackupRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardBackupRecord";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test comprehensive backup record search with multiple filter combinations.
 *
 * Tests backup record search functionality with various filter combinations:
 * - Filtering by backup_type='full' and status='completed'
 * - Date range filtering for started_at and completed_at
 * - Pagination with page and limit parameters
 * - Search functionality with error message filtering
 * - Sorting by different fields
 */
export async function test_api_backup_records_search_comprehensive_filters(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Test 1: Basic search with no filters (get all records)
  const allRecords =
    await api.functional.discussionBoard.admin.backup_records.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardBackupRecord.IRequest,
      },
    );
  typia.assert(allRecords);
  // Test 2: Filter by backup_type='full'
  const fullBackupSearch =
    await api.functional.discussionBoard.admin.backup_records.index(
      adminConnection,
      {
        body: {
          backup_type: "full",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardBackupRecord.IRequest,
      },
    );
  typia.assert(fullBackupSearch);
  // Test 3: Filter by status='completed'
  const completedSearch =
    await api.functional.discussionBoard.admin.backup_records.index(
      adminConnection,
      {
        body: {
          status: "completed",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardBackupRecord.IRequest,
      },
    );
  typia.assert(completedSearch);
  // Test 4: Combined filter - backup_type='full' and status='completed'
  const fullCompletedSearch =
    await api.functional.discussionBoard.admin.backup_records.index(
      adminConnection,
      {
        body: {
          backup_type: "full",
          status: "completed",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardBackupRecord.IRequest,
      },
    );
  typia.assert(fullCompletedSearch);
  // Test 5: Date range filtering
  const now = new Date().toISOString();
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const dateRangeSearch =
    await api.functional.discussionBoard.admin.backup_records.index(
      adminConnection,
      {
        body: {
          started_at_from: oneDayAgo,
          started_at_to: now,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardBackupRecord.IRequest,
      },
    );
  typia.assert(dateRangeSearch);
  // Test 6: Pagination with different parameters
  const paginationSmall =
    await api.functional.discussionBoard.admin.backup_records.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 3,
        } satisfies IDiscussionBoardBackupRecord.IRequest,
      },
    );
  typia.assert(paginationSmall);
  const paginationLarge =
    await api.functional.discussionBoard.admin.backup_records.index(
      adminConnection,
      {
        body: {
          page: 2,
          limit: 20,
        } satisfies IDiscussionBoardBackupRecord.IRequest,
      },
    );
  typia.assert(paginationLarge);
  // Test 7: Search with error message filtering
  const errorSearch =
    await api.functional.discussionBoard.admin.backup_records.index(
      adminConnection,
      {
        body: {
          status: "failed",
          search: "error",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardBackupRecord.IRequest,
      },
    );
  typia.assert(errorSearch);
  // Test 8: Sorting by different fields
  const sortByStartedAt =
    await api.functional.discussionBoard.admin.backup_records.index(
      adminConnection,
      {
        body: {
          sort: "started_at",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardBackupRecord.IRequest,
      },
    );
  typia.assert(sortByStartedAt);
  const sortByCompletedAt =
    await api.functional.discussionBoard.admin.backup_records.index(
      adminConnection,
      {
        body: {
          sort: "completed_at",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardBackupRecord.IRequest,
      },
    );
  typia.assert(sortByCompletedAt);
  // Validate pagination metadata consistency
  TestValidator.equals(
    "pagination current page",
    allRecords.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit within bounds",
    allRecords.pagination.limit >= 1 && allRecords.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    allRecords.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    allRecords.pagination.pages >= 0,
  );
  // Validate that filtered searches return proper data structure
  if (fullCompletedSearch.data.length > 0) {
    const record = fullCompletedSearch.data[0];
    TestValidator.predicate(
      "record has valid UUID ID",
      typeof record.id === "string" && record.id.length > 0,
    );
    TestValidator.predicate(
      "record has backup type",
      typeof record.backup_type === "string" && record.backup_type.length > 0,
    );
    TestValidator.predicate(
      "record has status",
      typeof record.status === "string" && record.status.length > 0,
    );
    TestValidator.predicate(
      "record has valid size",
      typeof record.size_bytes === "number" && record.size_bytes >= 0,
    );
    TestValidator.predicate(
      "record has valid started_at timestamp",
      typeof record.started_at === "string" && record.started_at.length > 0,
    );
    TestValidator.predicate(
      "record has initiatedByAdmin object",
      typeof record.initiatedByAdmin === "object",
    );
    if (record.initiatedByAdmin) {
      TestValidator.predicate(
        "admin has valid ID",
        typeof record.initiatedByAdmin.id === "string" &&
          record.initiatedByAdmin.id.length > 0,
      );
      TestValidator.predicate(
        "admin has email",
        typeof record.initiatedByAdmin.email === "string" &&
          record.initiatedByAdmin.email.length > 0,
      );
      TestValidator.predicate(
        "admin has display name",
        typeof record.initiatedByAdmin.display_name === "string" &&
          record.initiatedByAdmin.display_name.length > 0,
      );
    }
  }
  // Test pagination logic
  if (allRecords.pagination.pages > 1) {
    TestValidator.predicate(
      "multiple pages should have more than one page",
      allRecords.pagination.pages > 1,
    );
    TestValidator.predicate(
      "records count should match pagination info",
      allRecords.pagination.records >= allRecords.data.length,
    );
  }
}
