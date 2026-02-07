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
 * Test updating maintenance schedule impact level and description by a super administrator.
 * 1. Create a super administrator account via join endpoint for authentication
 * 2. Create an existing maintenance schedule with medium impact level
 * 3. Update the impact_level from 'medium' to 'high' and modify the description
 * 4. Add notes about the impact change
 * 5. Validate response includes updated impact level and description
 * 6. Verify timing and status information is preserved
 */
export async function test_api_maintenance_schedule_impact_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin"
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 2. Create initial maintenance schedule with medium impact
  const initialSchedule =
    await generate_random_discussion_board_super_admin_maintenance_schedules_create(
      superAdminConnection,
      {
        body: {
          maintenance_type: "system update",
          description: RandomGenerator.paragraph({ sentences: 3 }),
          scheduled_start_time: new Date(Date.now() + 86400000).toISOString(), // tomorrow
          scheduled_end_time: new Date(Date.now() + 172800000).toISOString(), // day after tomorrow
          estimated_duration_minutes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          impact_level: "medium",
          notes: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardMaintenanceSchedule.ICreate,
      },
    );
  typia.assert(initialSchedule);
  // 3. Update maintenance schedule with high impact level
  const updatedSchedule =
    await api.functional.discussionBoard.superAdmin.maintenance_schedules.update(
      superAdminConnection,
      {
        scheduleId: initialSchedule.id,
        body: {
          impact_level: "high",
          description: RandomGenerator.paragraph({ sentences: 4 }),
          notes:
            "Impact level increased from medium to high due to extended downtime requirements",
        } satisfies IDiscussionBoardMaintenanceSchedule.IUpdate,
      },
    );
  typia.assert(updatedSchedule);
  // 4. Validate updated fields
  TestValidator.equals(
    "impact level updated",
    updatedSchedule.impact_level,
    "high",
  );
  TestValidator.notEquals(
    "description changed",
    updatedSchedule.description,
    initialSchedule.description,
  );
  TestValidator.equals(
    "notes updated",
    updatedSchedule.notes,
    "Impact level increased from medium to high due to extended downtime requirements",
  );
  // 5. Validate preserved fields
  TestValidator.equals(
    "maintenance type preserved",
    updatedSchedule.maintenance_type,
    initialSchedule.maintenance_type,
  );
  TestValidator.equals(
    "scheduled start time preserved",
    updatedSchedule.scheduled_start_time,
    initialSchedule.scheduled_start_time,
  );
  TestValidator.equals(
    "scheduled end time preserved",
    updatedSchedule.scheduled_end_time,
    initialSchedule.scheduled_end_time,
  );
  TestValidator.equals(
    "estimated duration preserved",
    updatedSchedule.estimated_duration_minutes,
    initialSchedule.estimated_duration_minutes,
  );
  TestValidator.equals(
    "status preserved",
    updatedSchedule.status,
    initialSchedule.status,
  );
  TestValidator.equals(
    "scheduled by admin preserved",
    updatedSchedule.scheduled_by_admin.id,
    initialSchedule.scheduled_by_admin.id,
  );
  // 6. Validate business logic consistency
  TestValidator.predicate(
    "high impact level is valid",
    updatedSchedule.impact_level === "high",
  );
  TestValidator.predicate(
    "description is non-empty",
    updatedSchedule.description.length > 0,
  );
  TestValidator.predicate(
    "scheduled start time is before end time",
    new Date(updatedSchedule.scheduled_start_time) <
      new Date(updatedSchedule.scheduled_end_time),
  );
}