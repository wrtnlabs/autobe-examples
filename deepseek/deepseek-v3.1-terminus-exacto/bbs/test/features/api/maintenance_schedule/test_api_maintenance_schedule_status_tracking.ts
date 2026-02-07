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
import { generate_random_discussion_board_super_admin_maintenance_schedules_create } from "../../../generate/generate_random_discussion_board_super_admin_maintenance_schedules_create";
import { prepare_random_discussion_board_maintenance_schedule } from "../../../prepare/prepare_random_discussion_board_maintenance_schedule";

/**
 * Test updating maintenance schedule status and actual execution tracking by a super administrator.
 * 1. Create and authenticate a super administrator account
 * 2. Create a scheduled maintenance record
 * 3. Update the maintenance status from 'scheduled' to 'in-progress' with actual_start_time
 * 4. Validate status transition and actual timing information
 */
export async function test_api_maintenance_schedule_status_tracking(
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
  // Create a scheduled maintenance using the utility function
  const scheduledStartTime = new Date(Date.now() + 3600000).toISOString(); // 1 hour from now
  const scheduledEndTime = new Date(Date.now() + 7200000).toISOString(); // 2 hours from now
  const maintenanceSchedule =
    await generate_random_discussion_board_super_admin_maintenance_schedules_create(
      superAdminConnection,
      {
        body: {
          maintenance_type: "system update",
          description: RandomGenerator.paragraph({ sentences: 3 }),
          scheduled_start_time: scheduledStartTime,
          scheduled_end_time: scheduledEndTime,
          estimated_duration_minutes: 60,
          impact_level: "medium",
          notes: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies DeepPartial<IDiscussionBoardMaintenanceSchedule.ICreate>,
      },
    );
  typia.assert(maintenanceSchedule);
  // Verify initial status is 'scheduled'
  TestValidator.equals(
    "initial status should be scheduled",
    maintenanceSchedule.status,
    "scheduled",
  );
  TestValidator.equals(
    "actual_start_time should be null initially",
    maintenanceSchedule.actual_start_time,
    null,
  );
  // Update maintenance status to 'in-progress' with actual_start_time
  const actualStartTime = new Date().toISOString();
  const updatedSchedule =
    await api.functional.discussionBoard.superAdmin.maintenance_schedules.update(
      superAdminConnection,
      {
        scheduleId: maintenanceSchedule.id,
        body: {
          status: "in-progress",
          actual_start_time: actualStartTime,
        } satisfies IDiscussionBoardMaintenanceSchedule.IUpdate,
      },
    );
  typia.assert(updatedSchedule);
  // Validate status transition and actual timing
  TestValidator.equals(
    "status should be updated to in-progress",
    updatedSchedule.status,
    "in-progress",
  );
  TestValidator.equals(
    "actual_start_time should be set",
    updatedSchedule.actual_start_time,
    actualStartTime,
  );
  TestValidator.equals(
    "scheduled_start_time should remain unchanged",
    updatedSchedule.scheduled_start_time,
    maintenanceSchedule.scheduled_start_time,
  );
  TestValidator.equals(
    "scheduled_end_time should remain unchanged",
    updatedSchedule.scheduled_end_time,
    maintenanceSchedule.scheduled_end_time,
  );
  // Verify other properties remain unchanged
  TestValidator.equals(
    "maintenance_type should remain unchanged",
    updatedSchedule.maintenance_type,
    maintenanceSchedule.maintenance_type,
  );
  TestValidator.equals(
    "description should remain unchanged",
    updatedSchedule.description,
    maintenanceSchedule.description,
  );
  TestValidator.equals(
    "impact_level should remain unchanged",
    updatedSchedule.impact_level,
    maintenanceSchedule.impact_level,
  );
}
