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

export async function test_api_maintenance_schedule_creation_successful(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 2. Create maintenance schedule with valid future timestamps
  const scheduledStartTime = new Date(
    Date.now() + 24 * 60 * 60 * 1000,
  ).toISOString(); // Tomorrow
  const scheduledEndTime = new Date(
    Date.now() + 25 * 60 * 60 * 1000,
  ).toISOString(); // Tomorrow + 1 hour
  const estimatedDurationMinutes = 60;
  const maintenanceSchedule =
    await generate_random_discussion_board_super_admin_maintenance_schedules_create(
      superAdminConnection,
      {
        body: {
          maintenance_type: "system_update",
          description: typia.random<string>(),
          scheduled_start_time: scheduledStartTime,
          scheduled_end_time: scheduledEndTime,
          estimated_duration_minutes: estimatedDurationMinutes,
          impact_level: "low",
          notes: typia.random<string>(),
        } satisfies IDiscussionBoardMaintenanceSchedule.ICreate,
      },
    );
  typia.assert(maintenanceSchedule);
  // 3. Validate response structure and business logic
  TestValidator.equals(
    "status should be 'scheduled'",
    maintenanceSchedule.status,
    "scheduled",
  );
  TestValidator.equals(
    "scheduled_by_admin should match authenticated super admin",
    maintenanceSchedule.scheduled_by_admin.id,
    superAdmin.id,
  );
  TestValidator.equals(
    "actual_start_time should be null",
    maintenanceSchedule.actual_start_time,
    null,
  );
  TestValidator.equals(
    "actual_end_time should be null",
    maintenanceSchedule.actual_end_time,
    null,
  );
  TestValidator.equals(
    "actual_duration_minutes should be null",
    maintenanceSchedule.actual_duration_minutes,
    null,
  );
  TestValidator.equals(
    "maintenance_type should match input",
    maintenanceSchedule.maintenance_type,
    "system_update",
  );
  TestValidator.equals(
    "scheduled_start_time should match input",
    maintenanceSchedule.scheduled_start_time,
    scheduledStartTime,
  );
  TestValidator.equals(
    "scheduled_end_time should match input",
    maintenanceSchedule.scheduled_end_time,
    scheduledEndTime,
  );
  TestValidator.equals(
    "estimated_duration_minutes should match input",
    maintenanceSchedule.estimated_duration_minutes,
    estimatedDurationMinutes,
  );
  TestValidator.equals(
    "impact_level should match input",
    maintenanceSchedule.impact_level,
    "low",
  );
  TestValidator.predicate(
    "created_at should be recent",
    Date.now() - new Date(maintenanceSchedule.created_at).getTime() < 5000,
  );
  TestValidator.predicate(
    "updated_at should be recent",
    Date.now() - new Date(maintenanceSchedule.updated_at).getTime() < 5000,
  );
  TestValidator.equals(
    "deleted_at should be null",
    maintenanceSchedule.deleted_at,
    null,
  );
}
