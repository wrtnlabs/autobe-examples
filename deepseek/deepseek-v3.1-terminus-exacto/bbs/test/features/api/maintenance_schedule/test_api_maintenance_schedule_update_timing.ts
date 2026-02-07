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
 * Test updating maintenance schedule timing information by a super administrator.
 *
 * 1. Create super administrator account via join endpoint
 * 2. Create initial maintenance schedule with timing information
 * 3. Update scheduled_start_time and scheduled_end_time
 * 4. Validate timing updates and preservation of other details
 * 5. Verify timing validation (end_time > start_time)
 */
export async function test_api_maintenance_schedule_update_timing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 2. Create initial maintenance schedule
  const initialSchedule =
    await generate_random_discussion_board_super_admin_maintenance_schedules_create(
      superAdminConnection,
      {
        body: {
          maintenance_type: "system update",
          description: RandomGenerator.paragraph({ sentences: 3 }),
          scheduled_start_time: new Date(
            Date.now() + 24 * 60 * 60 * 1000,
          ).toISOString(), // Tomorrow
          scheduled_end_time: new Date(
            Date.now() + 25 * 60 * 60 * 1000,
          ).toISOString(), // Tomorrow + 1 hour
          estimated_duration_minutes: 60,
          impact_level: "medium",
          notes: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardMaintenanceSchedule.ICreate,
      },
    );
  typia.assert(initialSchedule);
  // 3. Update timing information
  const updatedStartTime = new Date(
    Date.now() + 48 * 60 * 60 * 1000,
  ).toISOString(); // 2 days from now
  const updatedEndTime = new Date(
    Date.now() + 49 * 60 * 60 * 1000,
  ).toISOString(); // 2 days + 1 hour from now
  // Check if utility function exists for update endpoint
  // Since no utility function is provided for PUT /discussionBoard/superAdmin/maintenance-schedules/{scheduleId}
  // Use SDK function directly
  const updatedSchedule =
    await api.functional.discussionBoard.superAdmin.maintenance_schedules.update(
      superAdminConnection,
      {
        scheduleId: initialSchedule.id,
        body: {
          scheduled_start_time: updatedStartTime,
          scheduled_end_time: updatedEndTime,
        } satisfies IDiscussionBoardMaintenanceSchedule.IUpdate,
      },
    );
  typia.assert(updatedSchedule);
  // 4. Validate timing updates
  TestValidator.equals(
    "schedule ID should remain unchanged",
    updatedSchedule.id,
    initialSchedule.id,
  );
  TestValidator.equals(
    "scheduled_start_time should be updated",
    updatedSchedule.scheduled_start_time,
    updatedStartTime,
  );
  TestValidator.equals(
    "scheduled_end_time should be updated",
    updatedSchedule.scheduled_end_time,
    updatedEndTime,
  );
  TestValidator.predicate(
    "scheduled_end_time must be after scheduled_start_time",
    new Date(updatedSchedule.scheduled_end_time) >
      new Date(updatedSchedule.scheduled_start_time),
  );
  // 5. Validate preservation of other details
  TestValidator.equals(
    "maintenance_type should remain unchanged",
    updatedSchedule.maintenance_type,
    initialSchedule.maintenance_type,
  );
  TestValidator.equals(
    "description should remain unchanged",
    updatedSchedule.description,
    initialSchedule.description,
  );
  TestValidator.equals(
    "impact_level should remain unchanged",
    updatedSchedule.impact_level,
    initialSchedule.impact_level,
  );
  TestValidator.equals(
    "estimated_duration_minutes should remain unchanged",
    updatedSchedule.estimated_duration_minutes,
    initialSchedule.estimated_duration_minutes,
  );
  // Handle nullable notes field
  if (initialSchedule.notes !== null) {
    TestValidator.equals(
      "notes should remain unchanged",
      updatedSchedule.notes,
      initialSchedule.notes,
    );
  } else {
    TestValidator.equals(
      "notes should remain null",
      updatedSchedule.notes,
      null,
    );
  }
  TestValidator.equals(
    "status should remain unchanged",
    updatedSchedule.status,
    initialSchedule.status,
  );
  // 6. Validate timing consistency with precise calculation
  const startTime = new Date(updatedSchedule.scheduled_start_time).getTime();
  const endTime = new Date(updatedSchedule.scheduled_end_time).getTime();
  const actualDurationMinutes = Math.round((endTime - startTime) / (60 * 1000));
  TestValidator.equals(
    "actual duration should match estimated duration",
    actualDurationMinutes,
    updatedSchedule.estimated_duration_minutes,
  );
}
