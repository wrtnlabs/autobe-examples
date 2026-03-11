import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMaintenanceSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMaintenanceSchedule";
import type { IDiscussionBoardStatusType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusType";
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
 * Test super administrator using complex filtering criteria to find specific maintenance schedules.
 * Validates that super admin can combine multiple search criteria including maintenance type,
 * date ranges, status type, and text search with pagination support.
 */
export async function test_api_maintenance_schedule_complex_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 2. Test complex filtering combinations using actual API data
  // Test 1: Filter by maintenance type
  const backupFilter: IDiscussionBoardMaintenanceSchedule.IRequest = {
    maintenance_type: "backup",
    page: 1,
    limit: 10,
  };
  const backupResults =
    await api.functional.discussionBoard.superAdmin.maintenance_schedules.index(
      superAdminConnection,
      { body: backupFilter },
    );
  typia.assert(backupResults);
  // Validate that all returned schedules match the filter criteria
  if (backupResults.data.length > 0) {
    TestValidator.predicate(
      "all backup schedules have correct type",
      backupResults.data.every(
        (schedule) => schedule.maintenance_type === "backup",
      ),
    );
  }
  // Test 2: Filter by date range
  const today = new Date().toISOString();
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const dateFilter: IDiscussionBoardMaintenanceSchedule.IRequest = {
    planned_start_at: today,
    planned_end_at: tomorrow,
    page: 1,
    limit: 10,
  };
  const dateResults =
    await api.functional.discussionBoard.superAdmin.maintenance_schedules.index(
      superAdminConnection,
      { body: dateFilter },
    );
  typia.assert(dateResults);
  // Test 3: Filter by text search
  const searchFilter: IDiscussionBoardMaintenanceSchedule.IRequest = {
    search: "backup",
    page: 1,
    limit: 10,
  };
  const searchResults =
    await api.functional.discussionBoard.superAdmin.maintenance_schedules.index(
      superAdminConnection,
      { body: searchFilter },
    );
  typia.assert(searchResults);
  // Test 4: Combined filter with multiple criteria
  const combinedFilter: IDiscussionBoardMaintenanceSchedule.IRequest = {
    maintenance_type: "system_update",
    planned_start_at: today,
    search: "system",
    page: 1,
    limit: 5,
  };
  const combinedResults =
    await api.functional.discussionBoard.superAdmin.maintenance_schedules.index(
      superAdminConnection,
      { body: combinedFilter },
    );
  typia.assert(combinedResults);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination metadata exists",
    combinedResults.pagination !== undefined,
  );
  TestValidator.predicate(
    "current page is valid",
    combinedResults.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit is valid",
    combinedResults.pagination.limit >= 1 &&
      combinedResults.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "records count is non-negative",
    combinedResults.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    combinedResults.pagination.pages >= 0,
  );
  // Test 5: Edge case - empty filter (should return all schedules)
  const emptyFilter: IDiscussionBoardMaintenanceSchedule.IRequest = {
    page: 1,
    limit: 10,
  };
  const emptyResults =
    await api.functional.discussionBoard.superAdmin.maintenance_schedules.index(
      superAdminConnection,
      { body: emptyFilter },
    );
  typia.assert(emptyResults);
  // Test 6: Filter with null values
  const nullFilter: IDiscussionBoardMaintenanceSchedule.IRequest = {
    status_type_id: null,
    maintenance_type: null,
    planned_start_at: null,
    planned_end_at: null,
    search: null,
    page: 1,
    limit: 10,
  };
  const nullResults =
    await api.functional.discussionBoard.superAdmin.maintenance_schedules.index(
      superAdminConnection,
      { body: nullFilter },
    );
  typia.assert(nullResults);
  // Test 7: Test error handling for invalid parameters
  await TestValidator.error(
    "invalid parameters should be handled",
    async () => {
      const invalidFilter = {
        page: 0, // Invalid page number
        limit: 10,
      } satisfies IDiscussionBoardMaintenanceSchedule.IRequest;
      await api.functional.discussionBoard.superAdmin.maintenance_schedules.index(
        superAdminConnection,
        { body: invalidFilter },
      );
    },
  );
}
