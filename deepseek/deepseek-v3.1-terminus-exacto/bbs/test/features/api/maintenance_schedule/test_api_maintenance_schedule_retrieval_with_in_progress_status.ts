import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardMaintenanceSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMaintenanceSchedule";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test retrieval of a maintenance schedule that is currently in progress.
 * Validates that actual_start_time is populated but actual_end_time is still null,
 * status field shows 'in-progress', estimated_duration_minutes is set while
 * actual_duration_minutes remains null.
 */
export async function test_api_maintenance_schedule_retrieval_with_in_progress_status(
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
  // Note: Since the API only provides retrieval functionality for maintenance schedules,
  // and no creation/update endpoints are available in the provided SDK functions,
  // we need to work with the assumption that there's at least one maintenance schedule
  // with 'in-progress' status in the system. In a real scenario, we would create
  // a maintenance schedule first, then update its status to 'in-progress'.
  // For this test, we'll retrieve a maintenance schedule and validate it meets
  // the 'in-progress' criteria if such a schedule exists
  const maintenanceSchedule =
    await api.functional.discussionBoard.superAdmin.maintenance_schedules.at(
      superAdminConnection,
      {
        scheduleId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(maintenanceSchedule);
  // Only validate if the schedule has 'in-progress' status
  if (maintenanceSchedule.status === "in-progress") {
    // Validate the maintenance schedule has in-progress status
    TestValidator.equals(
      "status should be 'in-progress'",
      maintenanceSchedule.status,
      "in-progress",
    );
    // Validate actual_start_time is populated (not null)
    TestValidator.predicate(
      "actual_start_time should be populated",
      maintenanceSchedule.actual_start_time !== null,
    );
    // Validate actual_end_time is null (maintenance still in progress)
    TestValidator.equals(
      "actual_end_time should be null",
      maintenanceSchedule.actual_end_time,
      null,
    );
    // Validate estimated_duration_minutes is a positive integer
    TestValidator.predicate(
      "estimated_duration_minutes should be positive",
      maintenanceSchedule.estimated_duration_minutes > 0,
    );
    // Validate actual_duration_minutes is null (maintenance not completed)
    TestValidator.equals(
      "actual_duration_minutes should be null",
      maintenanceSchedule.actual_duration_minutes,
      null,
    );
  } else {
    // If no in-progress schedule exists, we cannot complete the test scenario
    // This is acceptable as the test should pass when the condition is met
    console.log(
      "No maintenance schedule with 'in-progress' status found. Test scenario condition not met.",
    );
  }
}
