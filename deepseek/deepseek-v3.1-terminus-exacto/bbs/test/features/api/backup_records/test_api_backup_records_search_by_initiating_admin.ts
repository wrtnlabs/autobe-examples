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
 * Test backup records search filtering by the administrator who initiated the backup operation.
 * A super administrator searches for backups initiated by a specific administrator.
 * Verify that the system correctly joins with the discussion_board_admins table to include
 * administrator information, filters records by initiated_by_admin_id, and returns the
 * initiating administrator's summary details in the response.
 */
export async function test_api_backup_records_search_by_initiating_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // First, get all backup records to understand what's available
  const allBackups =
    await api.functional.discussionBoard.superAdmin.backup_records.operations.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardBackupRecord.IRequest,
      },
    );
  typia.assert(allBackups);
  // If there are backup records, test filtering by different administrators
  if (allBackups.data.length > 0) {
    // Get unique administrator IDs from the existing records
    const adminIds = Array.from(
      new Set(allBackups.data.map((record) => record.initiatedByAdmin.id)),
    );
    if (adminIds.length > 0) {
      // Test filtering by the first administrator found
      const firstAdminId = adminIds[0];
      const filteredBackups =
        await api.functional.discussionBoard.superAdmin.backup_records.operations.index(
          superAdminConnection,
          {
            body: {
              initiated_by_admin_id: firstAdminId,
              page: 1,
              limit: 100,
            } satisfies IDiscussionBoardBackupRecord.IRequest,
          },
        );
      typia.assert(filteredBackups);
      // Validate that all returned records belong to the specified administrator
      TestValidator.equals(
        "all filtered records belong to specified admin",
        filteredBackups.data.every(
          (record) => record.initiatedByAdmin.id === firstAdminId,
        ),
        true,
      );
      // Validate administrator summary information is present
      if (filteredBackups.data.length > 0) {
        const sampleRecord = filteredBackups.data[0];
        TestValidator.equals(
          "admin id matches filter",
          sampleRecord.initiatedByAdmin.id,
          firstAdminId,
        );
        TestValidator.predicate(
          "admin email exists",
          sampleRecord.initiatedByAdmin.email.length > 0,
        );
        TestValidator.predicate(
          "admin display name exists",
          sampleRecord.initiatedByAdmin.display_name.length > 0,
        );
        TestValidator.predicate(
          "admin created_at is valid",
          sampleRecord.initiatedByAdmin.created_at.length > 0,
        );
      }
      // Test pagination with administrator filter
      const paginatedSearch =
        await api.functional.discussionBoard.superAdmin.backup_records.operations.index(
          superAdminConnection,
          {
            body: {
              initiated_by_admin_id: firstAdminId,
              page: 1,
              limit: 2,
            } satisfies IDiscussionBoardBackupRecord.IRequest,
          },
        );
      typia.assert(paginatedSearch);
      // Validate pagination metadata
      TestValidator.predicate(
        "pagination metadata exists",
        paginatedSearch.pagination !== undefined,
      );
      TestValidator.equals(
        "current page is 1",
        paginatedSearch.pagination.current,
        1,
      );
      TestValidator.equals(
        "limit is respected",
        paginatedSearch.pagination.limit,
        2,
      );
      TestValidator.predicate(
        "records count is valid",
        paginatedSearch.pagination.records >= 0,
      );
      TestValidator.predicate(
        "pages count is valid",
        paginatedSearch.pagination.pages >= 0,
      );
    }
  } else {
    // If no backup records exist, test the search endpoint with a non-existent admin ID
    const nonExistentAdminId = typia.random<string & tags.Format<"uuid">>();
    const emptySearch =
      await api.functional.discussionBoard.superAdmin.backup_records.operations.index(
        superAdminConnection,
        {
          body: {
            initiated_by_admin_id: nonExistentAdminId,
            page: 1,
            limit: 10,
          } satisfies IDiscussionBoardBackupRecord.IRequest,
        },
      );
    typia.assert(emptySearch);
    // Should return empty results for non-existent admin
    TestValidator.equals(
      "no records for non-existent admin",
      emptySearch.data.length,
      0,
    );
    TestValidator.equals(
      "pagination shows zero records",
      emptySearch.pagination.records,
      0,
    );
    TestValidator.equals(
      "pagination shows zero pages",
      emptySearch.pagination.pages,
      0,
    );
  }
}
