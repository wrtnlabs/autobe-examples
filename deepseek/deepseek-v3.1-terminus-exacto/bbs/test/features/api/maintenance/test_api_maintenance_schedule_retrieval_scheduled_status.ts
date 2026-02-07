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

/**
 * Test retrieving a maintenance schedule that is currently in 'scheduled' status.
 * This scenario validates that administrators can access scheduled maintenance information
 * before it begins, including planned timing windows, impact level assessment, and
 * responsible administrator assignments.
 */
export async function test_api_maintenance_schedule_retrieval_scheduled_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Create a maintenance schedule in 'scheduled' status
  const maintenanceSchedule =
    await generate_random_discussion_board_admin_maintenance_schedules_create(
      adminConnection,
      {
        body: {
          maintenance_type: RandomGenerator.pick([
            "system update",
            "database backup",
            "security patch",
            "infrastructure maintenance",
          ] as const),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          scheduled_start_time: new Date(
            Date.now() + 24 * 60 * 60 * 1000,
          ).toISOString(), // Tomorrow
          scheduled_end_time: new Date(
            Date.now() + 25 * 60 * 60 * 1000,
          ).toISOString(), // Tomorrow + 1 hour
          estimated_duration_minutes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1440>
          >(),
          impact_level: RandomGenerator.pick([
            "low",
            "medium",
            "high",
            "critical",
          ] as const),
          notes: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardMaintenanceSchedule.ICreate,
      },
    );
  typia.assert(maintenanceSchedule);
  // 3. Retrieve the maintenance schedule
  const retrievedSchedule =
    await api.functional.discussionBoard.admin.maintenance_schedules.at(
      adminConnection,
      {
        scheduleId: maintenanceSchedule.id,
      },
    );
  typia.assert(retrievedSchedule);
  // 4. Validate the retrieved schedule
  TestValidator.equals(
    "schedule ID matches",
    retrievedSchedule.id,
    maintenanceSchedule.id,
  );
  TestValidator.equals(
    "status is scheduled",
    retrievedSchedule.status,
    "scheduled",
  );
  TestValidator.equals(
    "maintenance type matches",
    retrievedSchedule.maintenance_type,
    maintenanceSchedule.maintenance_type,
  );
  TestValidator.equals(
    "description matches",
    retrievedSchedule.description,
    maintenanceSchedule.description,
  );
  TestValidator.equals(
    "scheduled start time matches",
    retrievedSchedule.scheduled_start_time,
    maintenanceSchedule.scheduled_start_time,
  );
  TestValidator.equals(
    "scheduled end time matches",
    retrievedSchedule.scheduled_end_time,
    maintenanceSchedule.scheduled_end_time,
  );
  TestValidator.equals(
    "estimated duration matches",
    retrievedSchedule.estimated_duration_minutes,
    maintenanceSchedule.estimated_duration_minutes,
  );
  TestValidator.equals(
    "impact level matches",
    retrievedSchedule.impact_level,
    maintenanceSchedule.impact_level,
  );
  TestValidator.equals(
    "notes match",
    retrievedSchedule.notes,
    maintenanceSchedule.notes,
  );
  // 5. Verify actual execution fields are null for scheduled status
  TestValidator.equals(
    "actual start time is null",
    retrievedSchedule.actual_start_time,
    null,
  );
  TestValidator.equals(
    "actual end time is null",
    retrievedSchedule.actual_end_time,
    null,
  );
  TestValidator.equals(
    "actual duration is null",
    retrievedSchedule.actual_duration_minutes,
    null,
  );
  TestValidator.equals(
    "performed by admin is null",
    retrievedSchedule.performed_by_admin,
    null,
  );
  // 6. Validate administrator assignment
  TestValidator.predicate(
    "scheduled by admin is present",
    retrievedSchedule.scheduled_by_admin !== null,
  );
  TestValidator.predicate(
    "scheduled by admin has ID",
    retrievedSchedule.scheduled_by_admin.id.length > 0,
  );
  TestValidator.predicate(
    "scheduled by admin has email",
    retrievedSchedule.scheduled_by_admin.email.length > 0,
  );
  TestValidator.predicate(
    "scheduled by admin has display name",
    retrievedSchedule.scheduled_by_admin.display_name.length > 0,
  );
  TestValidator.predicate(
    "scheduled by admin has created at",
    retrievedSchedule.scheduled_by_admin.created_at.length > 0,
  );
}
