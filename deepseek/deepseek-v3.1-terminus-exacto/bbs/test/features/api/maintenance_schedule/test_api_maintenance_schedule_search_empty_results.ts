import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardMaintenanceSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMaintenanceSchedule";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardMaintenanceSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMaintenanceSchedule";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test maintenance schedule search with filters that should return empty results.
 * Search using filters that don't match any existing schedules (e.g., maintenance_type
 * that doesn't exist, date range with no schedules). Verify the API returns empty
 * data array with proper pagination metadata showing zero records.
 */
export async function test_api_maintenance_schedule_search_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super administrator using utility function
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Test 1: Search with non-existent maintenance_type
  const nonExistentTypeResult =
    await api.functional.discussionBoard.superAdmin.maintenance_schedules.index(
      superAdminConnection,
      {
        body: {
          maintenance_type: "non_existent_maintenance_type_12345",
        } satisfies IDiscussionBoardMaintenanceSchedule.IRequest,
      },
    );
  typia.assert(nonExistentTypeResult);
  TestValidator.equals(
    "empty data for non-existent type",
    nonExistentTypeResult.data.length,
    0,
  );
  TestValidator.equals(
    "zero records for non-existent type",
    nonExistentTypeResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "zero pages for non-existent type",
    nonExistentTypeResult.pagination.pages,
    0,
  );
  // Test 2: Search with date range that has no schedules (far future)
  const futureDate = new Date(Date.now() + 365 * 86400000).toISOString(); // 1 year in future
  const farFutureDate = new Date(Date.now() + 366 * 86400000).toISOString();
  const emptyDateRangeResult =
    await api.functional.discussionBoard.superAdmin.maintenance_schedules.index(
      superAdminConnection,
      {
        body: {
          scheduled_start_time_from: futureDate,
          scheduled_start_time_to: farFutureDate,
        } satisfies IDiscussionBoardMaintenanceSchedule.IRequest,
      },
    );
  typia.assert(emptyDateRangeResult);
  TestValidator.equals(
    "empty data for future date range",
    emptyDateRangeResult.data.length,
    0,
  );
  TestValidator.equals(
    "zero records for future date range",
    emptyDateRangeResult.pagination.records,
    0,
  );
  // Test 3: Combined filters that guarantee no matches
  const combinedFiltersResult =
    await api.functional.discussionBoard.superAdmin.maintenance_schedules.index(
      superAdminConnection,
      {
        body: {
          maintenance_type: "invalid_type_999",
          status: "invalid_status_999",
          impact_level: "invalid_impact_999",
          scheduled_start_time_from: futureDate,
          scheduled_start_time_to: farFutureDate,
        } satisfies IDiscussionBoardMaintenanceSchedule.IRequest,
      },
    );
  typia.assert(combinedFiltersResult);
  TestValidator.equals(
    "empty data for combined filters",
    combinedFiltersResult.data.length,
    0,
  );
  TestValidator.equals(
    "zero records for combined filters",
    combinedFiltersResult.pagination.records,
    0,
  );
  // Test 4: Search with empty string values
  const emptyStringResult =
    await api.functional.discussionBoard.superAdmin.maintenance_schedules.index(
      superAdminConnection,
      {
        body: {
          maintenance_type: "",
          status: "",
          impact_level: "",
        } satisfies IDiscussionBoardMaintenanceSchedule.IRequest,
      },
    );
  typia.assert(emptyStringResult);
  TestValidator.equals(
    "empty data for empty string filters",
    emptyStringResult.data.length,
    0,
  );
  TestValidator.equals(
    "zero records for empty string filters",
    emptyStringResult.pagination.records,
    0,
  );
}
