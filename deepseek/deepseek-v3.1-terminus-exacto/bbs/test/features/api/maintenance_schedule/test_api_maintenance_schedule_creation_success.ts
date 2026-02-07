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

export async function test_api_maintenance_schedule_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
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
  // Generate future timestamps for maintenance schedule
  const now = new Date();
  const scheduledStartTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 1 day from now
  const scheduledEndTime = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 2 days from now
  const estimatedDurationMinutes = Math.floor(
    (scheduledEndTime.getTime() - scheduledStartTime.getTime()) / (60 * 1000),
  );
  // Define valid maintenance types and impact levels
  const maintenanceTypes = [
    "system update",
    "database backup",
    "security patch",
    "infrastructure maintenance",
  ] as const;
  const impactLevels = ["low", "medium", "high", "critical"] as const;
  // Create maintenance schedule using utility function
  const maintenanceSchedule =
    await generate_random_discussion_board_admin_maintenance_schedules_create(
      adminConnection,
      {
        body: {
          maintenance_type: RandomGenerator.pick(maintenanceTypes),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          scheduled_start_time: scheduledStartTime.toISOString(),
          scheduled_end_time: scheduledEndTime.toISOString(),
          estimated_duration_minutes: estimatedDurationMinutes,
          impact_level: RandomGenerator.pick(impactLevels),
          notes: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardMaintenanceSchedule.ICreate,
      },
    );
  typia.assert(maintenanceSchedule);
  // Validate the created maintenance schedule
  TestValidator.equals(
    "status should be 'scheduled'",
    maintenanceSchedule.status,
    "scheduled",
  );
  TestValidator.predicate(
    "actual_start_time should be null",
    maintenanceSchedule.actual_start_time === null,
  );
  TestValidator.predicate(
    "actual_end_time should be null",
    maintenanceSchedule.actual_end_time === null,
  );
  TestValidator.predicate(
    "actual_duration_minutes should be null",
    maintenanceSchedule.actual_duration_minutes === null,
  );
  TestValidator.equals(
    "scheduled_by_admin should match authenticated admin",
    maintenanceSchedule.scheduled_by_admin.id,
    admin.id,
  );
  TestValidator.predicate(
    "performed_by_admin should be null",
    maintenanceSchedule.performed_by_admin === null,
  );
  // Calculate expected duration from the returned timestamps
  const expectedDurationMinutes = Math.floor(
    (new Date(maintenanceSchedule.scheduled_end_time).getTime() -
      new Date(maintenanceSchedule.scheduled_start_time).getTime()) /
      (60 * 1000),
  );
  TestValidator.equals(
    "estimated_duration_minutes should match calculated time difference",
    maintenanceSchedule.estimated_duration_minutes,
    expectedDurationMinutes,
  );
  TestValidator.predicate(
    "scheduled_start_time should be in the future",
    new Date(maintenanceSchedule.scheduled_start_time) > now,
  );
  TestValidator.predicate(
    "scheduled_end_time should be after scheduled_start_time",
    new Date(maintenanceSchedule.scheduled_end_time) >
      new Date(maintenanceSchedule.scheduled_start_time),
  );
}
