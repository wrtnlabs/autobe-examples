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

export async function test_api_backup_records_filter_complex(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection for authentication
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Note: Backup records are typically created by system operations, not through API calls
  // For this test, we'll assume some backup records already exist in the system
  // and focus on testing the filtering functionality
  // Test 1: Complex filter with backup_type and status
  const typeStatusFilter =
    await api.functional.discussionBoard.superAdmin.backup_records.index(
      superAdminConnection,
      {
        body: {
          backup_type: "full",
          status: "completed",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardBackupRecord.IRequest,
      },
    );
  typia.assert(typeStatusFilter);
  // Test 2: Date range filtering
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const dateFilter =
    await api.functional.discussionBoard.superAdmin.backup_records.index(
      superAdminConnection,
      {
        body: {
          started_at_from: oneDayAgo.toISOString(),
          started_at_to: now.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardBackupRecord.IRequest,
      },
    );
  typia.assert(dateFilter);
  // Test 3: Search functionality (assuming some records might have error messages)
  const searchFilter =
    await api.functional.discussionBoard.superAdmin.backup_records.index(
      superAdminConnection,
      {
        body: {
          search: "error",
          status: "failed",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardBackupRecord.IRequest,
      },
    );
  typia.assert(searchFilter);
  // Test 4: Empty result set with impossible combination
  const emptyFilter =
    await api.functional.discussionBoard.superAdmin.backup_records.index(
      superAdminConnection,
      {
        body: {
          backup_type: "full",
          status: "in_progress",
          completed_at_from: now.toISOString(), // Completed filter on in-progress records
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardBackupRecord.IRequest,
      },
    );
  typia.assert(emptyFilter);
  // Test 5: Multiple criteria combination
  const multiFilter =
    await api.functional.discussionBoard.superAdmin.backup_records.index(
      superAdminConnection,
      {
        body: {
          backup_type: "incremental",
          status: "completed",
          started_at_from: oneDayAgo.toISOString(),
          page: 1,
          limit: 5,
          sort: "started_at",
        } satisfies IDiscussionBoardBackupRecord.IRequest,
      },
    );
  typia.assert(multiFilter);
  // Validate pagination structure
  TestValidator.predicate(
    "pagination structure valid",
    multiFilter.pagination.current === 1 &&
      multiFilter.pagination.limit === 5 &&
      multiFilter.pagination.records >= 0 &&
      multiFilter.pagination.pages >= 0,
  );
  // Test 6: Boundary condition - exact timestamp matching
  const exactTimeFilter =
    await api.functional.discussionBoard.superAdmin.backup_records.index(
      superAdminConnection,
      {
        body: {
          started_at_from: oneDayAgo.toISOString(),
          started_at_to: oneDayAgo.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardBackupRecord.IRequest,
      },
    );
  typia.assert(exactTimeFilter);
}
