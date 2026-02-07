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
 * Test comprehensive filtering capabilities of maintenance schedule search functionality.
 * Search existing maintenance schedules using various filter combinations to validate
 * the search functionality works correctly with different criteria.
 */
export async function test_api_maintenance_schedule_search_comprehensive_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Test filtering by maintenance_type
  const systemUpdateFilter =
    await api.functional.discussionBoard.superAdmin.maintenance_schedules.index(
      superAdminConnection,
      {
        body: {
          maintenance_type: "system update",
        } satisfies IDiscussionBoardMaintenanceSchedule.IRequest,
      },
    );
  typia.assert(systemUpdateFilter);
  TestValidator.predicate(
    "system update filter returns valid response structure",
    Array.isArray(systemUpdateFilter.data) &&
      typeof systemUpdateFilter.pagination === "object" &&
      typeof systemUpdateFilter.pagination.current === "number" &&
      typeof systemUpdateFilter.pagination.limit === "number" &&
      typeof systemUpdateFilter.pagination.records === "number" &&
      typeof systemUpdateFilter.pagination.pages === "number",
  );
  // Test filtering by status
  const scheduledFilter =
    await api.functional.discussionBoard.superAdmin.maintenance_schedules.index(
      superAdminConnection,
      {
        body: {
          status: "scheduled",
        } satisfies IDiscussionBoardMaintenanceSchedule.IRequest,
      },
    );
  typia.assert(scheduledFilter);
  TestValidator.predicate(
    "scheduled filter returns valid response structure",
    Array.isArray(scheduledFilter.data) &&
      typeof scheduledFilter.pagination === "object",
  );
  // Test filtering by impact_level
  const highImpactFilter =
    await api.functional.discussionBoard.superAdmin.maintenance_schedules.index(
      superAdminConnection,
      {
        body: {
          impact_level: "high",
        } satisfies IDiscussionBoardMaintenanceSchedule.IRequest,
      },
    );
  typia.assert(highImpactFilter);
  TestValidator.predicate(
    "high impact filter returns valid response structure",
    Array.isArray(highImpactFilter.data) &&
      typeof highImpactFilter.pagination === "object",
  );
  // Test pagination
  const paginationTest =
    await api.functional.discussionBoard.superAdmin.maintenance_schedules.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardMaintenanceSchedule.IRequest,
      },
    );
  typia.assert(paginationTest);
  TestValidator.predicate(
    "pagination returns valid structure",
    Array.isArray(paginationTest.data) &&
      typeof paginationTest.pagination === "object" &&
      paginationTest.pagination.current === 1 &&
      paginationTest.pagination.limit === 5,
  );
  // Test combined filtering
  const combinedFilter =
    await api.functional.discussionBoard.superAdmin.maintenance_schedules.index(
      superAdminConnection,
      {
        body: {
          maintenance_type: "database backup",
          status: "completed",
          impact_level: "medium",
        } satisfies IDiscussionBoardMaintenanceSchedule.IRequest,
      },
    );
  typia.assert(combinedFilter);
  TestValidator.predicate(
    "combined filter returns valid response structure",
    Array.isArray(combinedFilter.data) &&
      typeof combinedFilter.pagination === "object",
  );
  // Test empty filter (get all)
  const allSchedules =
    await api.functional.discussionBoard.superAdmin.maintenance_schedules.index(
      superAdminConnection,
      {
        body: {} satisfies IDiscussionBoardMaintenanceSchedule.IRequest,
      },
    );
  typia.assert(allSchedules);
  TestValidator.predicate(
    "empty filter returns valid pagination structure",
    Array.isArray(allSchedules.data) &&
      typeof allSchedules.pagination === "object" &&
      allSchedules.pagination.records >= 0 &&
      allSchedules.pagination.pages >= 0,
  );
  // Validate schedule summary structure for returned data
  if (allSchedules.data.length > 0) {
    const sampleSchedule = allSchedules.data[0];
    TestValidator.predicate(
      "schedule summary has required fields",
      typeof sampleSchedule.id === "string" &&
        typeof sampleSchedule.maintenance_type === "string" &&
        typeof sampleSchedule.status === "string" &&
        typeof sampleSchedule.scheduled_start_time === "string" &&
        typeof sampleSchedule.scheduled_end_time === "string" &&
        typeof sampleSchedule.impact_level === "string" &&
        typeof sampleSchedule.scheduledByAdmin === "object" &&
        typeof sampleSchedule.scheduledByAdmin.id === "string" &&
        typeof sampleSchedule.scheduledByAdmin.email === "string" &&
        typeof sampleSchedule.scheduledByAdmin.display_name === "string" &&
        typeof sampleSchedule.scheduledByAdmin.created_at === "string",
    );
  }
}
