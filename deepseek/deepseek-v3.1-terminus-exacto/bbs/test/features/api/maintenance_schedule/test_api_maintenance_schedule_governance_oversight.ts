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
 * Test super administrator using maintenance schedule search for platform governance oversight.
 * Validate business workflow where super admin monitors scheduled maintenance activities
 * for operational planning.
 */
export async function test_api_maintenance_schedule_governance_oversight(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(authorized);
  // 2. Search for upcoming maintenance schedules
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  // Test future maintenance schedules
  const futureSchedules =
    await api.functional.discussionBoard.superAdmin.maintenance_schedules.index(
      superAdminConnection,
      {
        body: {
          planned_start_at: tomorrow,
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<50>
          >(),
          page: 1,
        } satisfies IDiscussionBoardMaintenanceSchedule.IRequest,
      },
    );
  typia.assert(futureSchedules);
  // 3. Validate pagination structure
  TestValidator.equals(
    "pagination structure",
    typeof futureSchedules.pagination,
    "object",
  );
  TestValidator.predicate(
    "has current page",
    futureSchedules.pagination.current >= 0,
  );
  TestValidator.predicate("has limit", futureSchedules.pagination.limit > 0);
  TestValidator.predicate(
    "has records count",
    futureSchedules.pagination.records >= 0,
  );
  TestValidator.predicate(
    "has pages count",
    futureSchedules.pagination.pages >= 0,
  );
  // 4. Validate maintenance schedule data structure
  if (futureSchedules.data.length > 0) {
    const schedule = futureSchedules.data[0];
    TestValidator.equals("has id", typeof schedule.id, "string");
    TestValidator.equals("has title", typeof schedule.title, "string");
    TestValidator.equals(
      "has maintenance_type",
      typeof schedule.maintenance_type,
      "string",
    );
    TestValidator.equals(
      "has planned_start_at",
      typeof schedule.planned_start_at,
      "string",
    );
    TestValidator.equals(
      "has planned_end_at",
      typeof schedule.planned_end_at,
      "string",
    );
    TestValidator.equals(
      "has statusType",
      typeof schedule.statusType,
      "object",
    );
    // Validate status type structure
    TestValidator.equals(
      "statusType has id",
      typeof schedule.statusType.id,
      "string",
    );
    TestValidator.equals(
      "statusType has category",
      typeof schedule.statusType.category,
      "string",
    );
    TestValidator.equals(
      "statusType has code",
      typeof schedule.statusType.code,
      "string",
    );
    TestValidator.equals(
      "statusType has display_name",
      typeof schedule.statusType.display_name,
      "string",
    );
    TestValidator.equals(
      "statusType has display_order",
      typeof schedule.statusType.display_order,
      "number",
    );
    TestValidator.equals(
      "statusType has is_active",
      typeof schedule.statusType.is_active,
      "boolean",
    );
  }
  // 5. Test search functionality with different filters
  const searchResults =
    await api.functional.discussionBoard.superAdmin.maintenance_schedules.index(
      superAdminConnection,
      {
        body: {
          search: RandomGenerator.alphabets(5),
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardMaintenanceSchedule.IRequest,
      },
    );
  typia.assert(searchResults);
  // 6. Test empty search criteria (should return all schedules)
  const allSchedules =
    await api.functional.discussionBoard.superAdmin.maintenance_schedules.index(
      superAdminConnection,
      {
        body: {
          limit: 5,
          page: 1,
        } satisfies IDiscussionBoardMaintenanceSchedule.IRequest,
      },
    );
  typia.assert(allSchedules);
  // 7. Validate that future schedules have planned_start_at after current time
  const currentTime = new Date().toISOString();
  futureSchedules.data.forEach((schedule, index) => {
    TestValidator.predicate(
      `schedule ${index} has future start time`,
      schedule.planned_start_at > currentTime,
    );
  });
}
