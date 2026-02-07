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
 * Test updating only specific fields of a maintenance schedule while leaving others unchanged.
 * Verify that partial updates work correctly and that unspecified fields retain their original values.
 * Test updating nullable fields like notes and actual timing information, including setting them to null and back to values.
 * Validate that the operation handles sequential updates properly.
 */
export async function test_api_maintenance_schedule_update_partial_fields(
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
  // Create initial maintenance schedule
  const initialSchedule =
    await generate_random_discussion_board_admin_maintenance_schedules_create(
      adminConnection,
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
          notes: "Initial notes for testing",
        } satisfies IDiscussionBoardMaintenanceSchedule.ICreate,
      },
    );
  typia.assert(initialSchedule);
  // Store initial timestamp for comparison
  const initialUpdatedAt = initialSchedule.updated_at;
  // Test 1: Partial update - change only maintenance type and description
  const partialUpdate1 =
    await api.functional.discussionBoard.admin.maintenance_schedules.update(
      adminConnection,
      {
        scheduleId: initialSchedule.id,
        body: {
          maintenance_type: "database backup",
          description: "Updated description for partial testing",
        } satisfies IDiscussionBoardMaintenanceSchedule.IUpdate,
      },
    );
  typia.assert(partialUpdate1);
  // Verify only specified fields changed and updated_at timestamp changed
  TestValidator.equals(
    "maintenance type updated",
    partialUpdate1.maintenance_type,
    "database backup",
  );
  TestValidator.equals(
    "description updated",
    partialUpdate1.description,
    "Updated description for partial testing",
  );
  TestValidator.equals(
    "scheduled start time unchanged",
    partialUpdate1.scheduled_start_time,
    initialSchedule.scheduled_start_time,
  );
  TestValidator.equals(
    "scheduled end time unchanged",
    partialUpdate1.scheduled_end_time,
    initialSchedule.scheduled_end_time,
  );
  TestValidator.equals(
    "impact level unchanged",
    partialUpdate1.impact_level,
    initialSchedule.impact_level,
  );
  TestValidator.equals(
    "notes unchanged",
    partialUpdate1.notes,
    initialSchedule.notes,
  );
  TestValidator.notEquals(
    "updated_at timestamp changed",
    partialUpdate1.updated_at,
    initialUpdatedAt,
  );
  // Test 2: Partial update - change timing information only
  const newStartTime = new Date(Date.now() + 259200000).toISOString(); // 3 days from now
  const newEndTime = new Date(Date.now() + 345600000).toISOString(); // 4 days from now
  const partialUpdate2 =
    await api.functional.discussionBoard.admin.maintenance_schedules.update(
      adminConnection,
      {
        scheduleId: initialSchedule.id,
        body: {
          scheduled_start_time: newStartTime,
          scheduled_end_time: newEndTime,
          estimated_duration_minutes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        } satisfies IDiscussionBoardMaintenanceSchedule.IUpdate,
      },
    );
  typia.assert(partialUpdate2);
  // Verify timing fields updated, others unchanged
  TestValidator.equals(
    "scheduled start time updated",
    partialUpdate2.scheduled_start_time,
    newStartTime,
  );
  TestValidator.equals(
    "scheduled end time updated",
    partialUpdate2.scheduled_end_time,
    newEndTime,
  );
  TestValidator.equals(
    "maintenance type unchanged",
    partialUpdate2.maintenance_type,
    "database backup",
  );
  TestValidator.equals(
    "description unchanged",
    partialUpdate2.description,
    "Updated description for partial testing",
  );
  TestValidator.notEquals(
    "updated_at timestamp changed again",
    partialUpdate2.updated_at,
    partialUpdate1.updated_at,
  );
  // Test 3: Partial update - set nullable fields to null
  const partialUpdate3 =
    await api.functional.discussionBoard.admin.maintenance_schedules.update(
      adminConnection,
      {
        scheduleId: initialSchedule.id,
        body: {
          notes: null,
          actual_start_time: null,
          actual_end_time: null,
          actual_duration_minutes: null,
        } satisfies IDiscussionBoardMaintenanceSchedule.IUpdate,
      },
    );
  typia.assert(partialUpdate3);
  // Verify nullable fields set to null
  TestValidator.equals("notes set to null", partialUpdate3.notes, null);
  TestValidator.equals(
    "actual start time set to null",
    partialUpdate3.actual_start_time,
    null,
  );
  TestValidator.equals(
    "actual end time set to null",
    partialUpdate3.actual_end_time,
    null,
  );
  TestValidator.equals(
    "actual duration set to null",
    partialUpdate3.actual_duration_minutes,
    null,
  );
  // Test 4: Partial update - set nullable fields back to values with logical constraints
  const actualStart = new Date().toISOString();
  const actualEnd = new Date(Date.now() + 3600000).toISOString(); // 1 hour later
  const actualDuration = 60;
  const partialUpdate4 =
    await api.functional.discussionBoard.admin.maintenance_schedules.update(
      adminConnection,
      {
        scheduleId: initialSchedule.id,
        body: {
          notes: "Restored notes after null test",
          actual_start_time: actualStart,
          actual_end_time: actualEnd,
          actual_duration_minutes: actualDuration,
        } satisfies IDiscussionBoardMaintenanceSchedule.IUpdate,
      },
    );
  typia.assert(partialUpdate4);
  // Verify nullable fields restored and timing constraints are logical
  TestValidator.equals(
    "notes restored",
    partialUpdate4.notes,
    "Restored notes after null test",
  );
  TestValidator.equals(
    "actual start time restored",
    partialUpdate4.actual_start_time,
    actualStart,
  );
  TestValidator.equals(
    "actual end time restored",
    partialUpdate4.actual_end_time,
    actualEnd,
  );
  TestValidator.equals(
    "actual duration restored",
    partialUpdate4.actual_duration_minutes,
    actualDuration,
  );
  TestValidator.predicate(
    "actual end time after actual start time",
    new Date(partialUpdate4.actual_end_time!).getTime() >
      new Date(partialUpdate4.actual_start_time!).getTime(),
  );
  // Test 5: Partial update - change status and impact level
  const partialUpdate5 =
    await api.functional.discussionBoard.admin.maintenance_schedules.update(
      adminConnection,
      {
        scheduleId: initialSchedule.id,
        body: {
          status: "in-progress",
          impact_level: "high",
        } satisfies IDiscussionBoardMaintenanceSchedule.IUpdate,
      },
    );
  typia.assert(partialUpdate5);
  // Verify status and impact level updated
  TestValidator.equals("status updated", partialUpdate5.status, "in-progress");
  TestValidator.equals(
    "impact level updated",
    partialUpdate5.impact_level,
    "high",
  );
  // Test 6: Sequential partial updates to same schedule (simulating multiple administrators)
  const sequentialUpdate1 =
    await api.functional.discussionBoard.admin.maintenance_schedules.update(
      adminConnection,
      {
        scheduleId: initialSchedule.id,
        body: {
          maintenance_type: "security patch",
        } satisfies IDiscussionBoardMaintenanceSchedule.IUpdate,
      },
    );
  typia.assert(sequentialUpdate1);
  const sequentialUpdate2 =
    await api.functional.discussionBoard.admin.maintenance_schedules.update(
      adminConnection,
      {
        scheduleId: initialSchedule.id,
        body: {
          description: "Final sequential update test",
        } satisfies IDiscussionBoardMaintenanceSchedule.IUpdate,
      },
    );
  typia.assert(sequentialUpdate2);
  // Verify sequential updates preserve previous changes
  TestValidator.equals(
    "maintenance type from first sequential update",
    sequentialUpdate2.maintenance_type,
    "security patch",
  );
  TestValidator.equals(
    "description from second sequential update",
    sequentialUpdate2.description,
    "Final sequential update test",
  );
  TestValidator.predicate(
    "sequential updates handled correctly",
    sequentialUpdate2.maintenance_type === "security patch" &&
      sequentialUpdate2.description === "Final sequential update test",
  );
}
