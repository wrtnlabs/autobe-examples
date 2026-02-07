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
 * Test retrieving a maintenance schedule that has been completed successfully.
 * This scenario validates that administrators can review completed maintenance activities,
 * including actual execution timing, duration comparisons, and performance metrics.
 * The test should verify that both scheduled and actual timing information is available,
 * with actual_duration_minutes matching the difference between actual_start_time and actual_end_time.
 * The response should include the performed_by_admin assignment, completion status,
 * and any notes documenting the maintenance execution process for audit and improvement purposes.
 */
export async function test_api_maintenance_schedule_retrieval_completed_status(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
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
  // Create a maintenance schedule
  const maintenanceSchedule =
    await generate_random_discussion_board_admin_maintenance_schedules_create(
      adminConnection,
      {
        body: {
          maintenance_type: "system update",
          description: RandomGenerator.paragraph({ sentences: 3 }),
          scheduled_start_time: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
          scheduled_end_time: new Date(Date.now() - 43200000).toISOString(), // 12 hours ago
          estimated_duration_minutes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          impact_level: "medium",
          notes: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardMaintenanceSchedule.ICreate,
      },
    );
  typia.assert(maintenanceSchedule);
  // Retrieve the maintenance schedule
  const retrievedSchedule =
    await api.functional.discussionBoard.admin.maintenance_schedules.at(
      adminConnection,
      {
        scheduleId: maintenanceSchedule.id,
      },
    );
  typia.assert(retrievedSchedule);
  // Validate the retrieved schedule matches the created one
  TestValidator.equals(
    "maintenance schedule ID",
    retrievedSchedule.id,
    maintenanceSchedule.id,
  );
  TestValidator.equals(
    "maintenance type",
    retrievedSchedule.maintenance_type,
    maintenanceSchedule.maintenance_type,
  );
  TestValidator.equals(
    "description",
    retrievedSchedule.description,
    maintenanceSchedule.description,
  );
  TestValidator.equals(
    "scheduled start time",
    retrievedSchedule.scheduled_start_time,
    maintenanceSchedule.scheduled_start_time,
  );
  TestValidator.equals(
    "scheduled end time",
    retrievedSchedule.scheduled_end_time,
    maintenanceSchedule.scheduled_end_time,
  );
  TestValidator.equals(
    "estimated duration",
    retrievedSchedule.estimated_duration_minutes,
    maintenanceSchedule.estimated_duration_minutes,
  );
  TestValidator.equals(
    "impact level",
    retrievedSchedule.impact_level,
    maintenanceSchedule.impact_level,
  );
  TestValidator.equals(
    "notes",
    retrievedSchedule.notes,
    maintenanceSchedule.notes,
  );
  // Validate administrator assignment
  TestValidator.predicate(
    "scheduled by admin should be set",
    retrievedSchedule.scheduled_by_admin !== null,
  );
  // Validate timestamps
  TestValidator.predicate(
    "created at should be set",
    retrievedSchedule.created_at !== null,
  );
  TestValidator.predicate(
    "updated at should be set",
    retrievedSchedule.updated_at !== null,
  );
  TestValidator.predicate(
    "deleted at should be null",
    retrievedSchedule.deleted_at === null,
  );
  // Note: Since we cannot update the schedule to completed status with the available APIs,
  // we validate the basic retrieval functionality. The completed status validation
  // would require additional API endpoints for updating maintenance schedules.
}
