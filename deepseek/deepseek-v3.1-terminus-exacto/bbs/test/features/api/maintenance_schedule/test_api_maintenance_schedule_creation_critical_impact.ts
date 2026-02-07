import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardMaintenanceSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMaintenanceSchedule";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_maintenance_schedules_create } from "../../../generate/generate_random_discussion_board_admin_maintenance_schedules_create";
import { prepare_random_discussion_board_maintenance_schedule } from "../../../prepare/prepare_random_discussion_board_maintenance_schedule";

export async function test_api_maintenance_schedule_creation_critical_impact(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Register and authenticate as administrator
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // Create maintenance schedule with critical impact
  const futureDate = new Date(Date.now() + 86400000); // 1 day from now
  const scheduledStartTime = futureDate.toISOString();
  const scheduledEndTime = new Date(
    futureDate.getTime() + 3600000,
  ).toISOString(); // 1 hour later
  const estimatedDurationMinutes = 60;
  const maintenanceSchedule =
    await api.functional.discussionBoard.admin.maintenance_schedules.create(
      adminConnection,
      {
        body: {
          maintenance_type: "system_update",
          description: RandomGenerator.paragraph({ sentences: 3 }),
          scheduled_start_time: scheduledStartTime,
          scheduled_end_time: scheduledEndTime,
          estimated_duration_minutes: estimatedDurationMinutes,
          impact_level: "critical",
          notes: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardMaintenanceSchedule.ICreate,
      },
    );
  typia.assert(maintenanceSchedule);
  // Validate critical impact level
  TestValidator.equals(
    "impact level should be critical",
    maintenanceSchedule.impact_level,
    "critical",
  );
  // Validate status is scheduled
  TestValidator.equals(
    "status should be scheduled",
    maintenanceSchedule.status,
    "scheduled",
  );
  // Validate timing fields
  TestValidator.equals(
    "scheduled start time matches",
    maintenanceSchedule.scheduled_start_time,
    scheduledStartTime,
  );
  TestValidator.equals(
    "scheduled end time matches",
    maintenanceSchedule.scheduled_end_time,
    scheduledEndTime,
  );
  TestValidator.equals(
    "estimated duration matches",
    maintenanceSchedule.estimated_duration_minutes,
    estimatedDurationMinutes,
  );
  // Validate administrator reference
  TestValidator.equals(
    "scheduled by admin matches",
    maintenanceSchedule.scheduled_by_admin.id,
    admin.id,
  );
  TestValidator.equals(
    "scheduled by admin email matches",
    maintenanceSchedule.scheduled_by_admin.email,
    admin.email,
  );
  // Validate actual fields are null (not yet performed)
  TestValidator.equals(
    "actual start time should be null",
    maintenanceSchedule.actual_start_time,
    null,
  );
  TestValidator.equals(
    "actual end time should be null",
    maintenanceSchedule.actual_end_time,
    null,
  );
  TestValidator.equals(
    "actual duration should be null",
    maintenanceSchedule.actual_duration_minutes,
    null,
  );
  TestValidator.equals(
    "performed by admin should be null",
    maintenanceSchedule.performed_by_admin,
    null,
  );
  // Validate system-generated fields exist
  TestValidator.predicate(
    "should have valid id",
    maintenanceSchedule.id.length > 0,
  );
  TestValidator.predicate(
    "should have created_at timestamp",
    maintenanceSchedule.created_at.length > 0,
  );
  TestValidator.predicate(
    "should have updated_at timestamp",
    maintenanceSchedule.updated_at.length > 0,
  );
  TestValidator.equals(
    "deleted_at should be null",
    maintenanceSchedule.deleted_at,
    null,
  );
}