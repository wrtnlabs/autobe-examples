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

/**
 * Test pagination behavior with different limit values and page numbers for backup records.
 * Validates that the pagination system correctly handles various page sizes and properly
 * calculates total pages based on record count.
 */
export async function test_api_backup_records_pagination_limits(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Test minimum limit (1 record per page)
  const minLimitResponse =
    await api.functional.discussionBoard.superAdmin.backup_records.index(
      superAdminConnection,
      {
        body: {
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
        } satisfies IDiscussionBoardBackupRecord.IRequest,
      },
    );
  typia.assert(minLimitResponse);
  TestValidator.equals(
    "minimum limit should be 1",
    minLimitResponse.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "minimum limit page should be valid",
    minLimitResponse.pagination.current >= 1,
  );
  // Test maximum limit (100 records per page)
  const maxLimitResponse =
    await api.functional.discussionBoard.superAdmin.backup_records.index(
      superAdminConnection,
      {
        body: {
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
        } satisfies IDiscussionBoardBackupRecord.IRequest,
      },
    );
  typia.assert(maxLimitResponse);
  TestValidator.equals(
    "maximum limit should be 100",
    maxLimitResponse.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "maximum limit page should be valid",
    maxLimitResponse.pagination.current >= 1,
  );
  // Test middle limit value
  const middleLimitResponse =
    await api.functional.discussionBoard.superAdmin.backup_records.index(
      superAdminConnection,
      {
        body: {
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
        } satisfies IDiscussionBoardBackupRecord.IRequest,
      },
    );
  typia.assert(middleLimitResponse);
  TestValidator.equals(
    "middle limit should be 50",
    middleLimitResponse.pagination.limit,
    50,
  );
  // Test page navigation - request page 2
  const page2Response =
    await api.functional.discussionBoard.superAdmin.backup_records.index(
      superAdminConnection,
      {
        body: {
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
        } satisfies IDiscussionBoardBackupRecord.IRequest,
      },
    );
  typia.assert(page2Response);
  TestValidator.equals(
    "page 2 should have correct page number",
    page2Response.pagination.current,
    2,
  );
  // Test last page behavior by requesting a very high page number
  const highPageResponse =
    await api.functional.discussionBoard.superAdmin.backup_records.index(
      superAdminConnection,
      {
        body: {
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
        } satisfies IDiscussionBoardBackupRecord.IRequest,
      },
    );
  typia.assert(highPageResponse);
  // Verify pagination metadata consistency
  TestValidator.predicate(
    "total records should be non-negative",
    highPageResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages should be non-negative",
    highPageResponse.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "current page should be within bounds",
    highPageResponse.pagination.current <= highPageResponse.pagination.pages ||
      highPageResponse.pagination.pages === 0,
  );
  // Test that data array length matches limit when not on last page
  if (highPageResponse.pagination.current < highPageResponse.pagination.pages) {
    TestValidator.equals(
      "data array length should match limit",
      highPageResponse.data.length,
      highPageResponse.pagination.limit,
    );
  }
  // Validate pagination calculations
  const totalRecords = highPageResponse.pagination.records;
  const limit = highPageResponse.pagination.limit;
  const expectedPages =
    totalRecords === 0 ? 0 : Math.ceil(totalRecords / limit);
  TestValidator.equals(
    "total pages calculation should be correct",
    highPageResponse.pagination.pages,
    expectedPages,
  );
}
