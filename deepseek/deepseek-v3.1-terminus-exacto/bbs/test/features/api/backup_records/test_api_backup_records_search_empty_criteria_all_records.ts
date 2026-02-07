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
 * Test backup record search with empty search criteria to verify the system returns all
 * non-deleted backup records with proper pagination.
 */
export async function test_api_backup_records_search_empty_criteria_all_records(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
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
  // 2. Perform search with empty criteria (no filters)
  const searchResult =
    await api.functional.discussionBoard.admin.backup_records.index(
      adminConnection,
      {
        body: {
          // Empty search criteria to get all records
        } satisfies IDiscussionBoardBackupRecord.IRequest,
      },
    );
  typia.assert(searchResult);
  // 3. Validate pagination metadata
  TestValidator.equals(
    "pagination exists",
    typeof searchResult.pagination,
    "object",
  );
  TestValidator.predicate(
    "current page is 1",
    searchResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "limit is positive",
    searchResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "total records is non-negative",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is non-negative",
    searchResult.pagination.pages >= 0,
  );
  // 4. Validate pagination calculations
  const expectedPages = Math.ceil(
    searchResult.pagination.records / searchResult.pagination.limit,
  );
  TestValidator.equals(
    "pages calculation",
    searchResult.pagination.pages,
    expectedPages,
  );
  // 5. Validate data structure
  TestValidator.equals("data is array", Array.isArray(searchResult.data), true);
  TestValidator.predicate(
    "data length matches limit",
    searchResult.data.length <= searchResult.pagination.limit,
  );
  // 6. Validate individual record structure (if records exist)
  if (searchResult.data.length > 0) {
    const record = searchResult.data[0];
    typia.assert(record);
    // Validate required fields
    TestValidator.predicate("record has id", typeof record.id === "string");
    TestValidator.predicate(
      "record has backup_type",
      typeof record.backup_type === "string",
    );
    TestValidator.predicate(
      "record has status",
      typeof record.status === "string",
    );
    TestValidator.predicate(
      "record has size_bytes",
      typeof record.size_bytes === "number",
    );
    TestValidator.predicate(
      "record has started_at",
      typeof record.started_at === "string",
    );
    TestValidator.predicate(
      "record has created_at",
      typeof record.created_at === "string",
    );
    TestValidator.predicate(
      "record has initiatedByAdmin",
      typeof record.initiatedByAdmin === "object",
    );
    // Validate initiatedByAdmin structure
    const admin = record.initiatedByAdmin;
    TestValidator.predicate("admin has id", typeof admin.id === "string");
    TestValidator.predicate("admin has email", typeof admin.email === "string");
    TestValidator.predicate(
      "admin has display_name",
      typeof admin.display_name === "string",
    );
    TestValidator.predicate(
      "admin has created_at",
      typeof admin.created_at === "string",
    );
  }
  // 7. Validate sorting by started_at descending (if multiple records exist)
  if (searchResult.data.length > 1) {
    for (let i = 1; i < searchResult.data.length; i++) {
      const currentRecord = searchResult.data[i];
      const previousRecord = searchResult.data[i - 1];
      const currentDate = new Date(currentRecord.started_at);
      const previousDate = new Date(previousRecord.started_at);
      TestValidator.predicate(
        `records sorted descending by started_at (position ${i})`,
        currentDate <= previousDate,
      );
    }
  }
}