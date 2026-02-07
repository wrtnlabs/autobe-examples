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
 * Test updating maintenance schedule timing information including scheduled start/end times
 * and transitioning status from scheduled to in-progress to completed. Verify that timing
 * validations are enforced (end time after start time) and that status transitions follow
 * the proper workflow. Test updating actual timing fields when maintenance progresses and
 * validate that actual duration is calculated correctly based on actual start and end times.
 */
export async function test_api_maintenance_schedule_update_timing_transition(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
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
  // 2. Create initial maintenance schedule with scheduled timing using utility function
  const futureStart = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // Tomorrow
  const futureEnd = new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(); // 1 hour later
  const initialSchedule =
    await generate_random_discussion_board_admin_maintenance_schedules_create(
      adminConnection,
      {
        body: {
          scheduled_start_time: futureStart,
          scheduled_end_time: futureEnd,
          estimated_duration_minutes: 60,
        },
      },
    );
  typia.assert(initialSchedule);
  // 3. Update scheduled timing to test validation (end time after start time)
  const updatedScheduledStart = new Date(
    Date.now() + 48 * 60 * 60 * 1000,
  ).toISOString(); // 2 days from now
  const updatedScheduledEnd = new Date(
    Date.now() + 49 * 60 * 60 * 1000,
  ).toISOString(); // 1 hour later
  const updatedSchedule =
    await api.functional.discussionBoard.admin.maintenance_schedules.update(
      adminConnection,
      {
        scheduleId: initialSchedule.id,
        body: {
          scheduled_start_time: updatedScheduledStart,
          scheduled_end_time: updatedScheduledEnd,
          estimated_duration_minutes: 60,
        } satisfies IDiscussionBoardMaintenanceSchedule.IUpdate,
      },
    );
  typia.assert(updatedSchedule);
  TestValidator.equals(
    "scheduled start time updated",
    updatedSchedule.scheduled_start_time,
    updatedScheduledStart,
  );
  TestValidator.equals(
    "scheduled end time updated",
    updatedSchedule.scheduled_end_time,
    updatedScheduledEnd,
  );
  // 4. Transition status from 'scheduled' to 'in-progress' with actual start time
  const actualStartTime = new Date().toISOString();
  const inProgressSchedule =
    await api.functional.discussionBoard.admin.maintenance_schedules.update(
      adminConnection,
      {
        scheduleId: initialSchedule.id,
        body: {
          status: "in-progress",
          actual_start_time: actualStartTime,
        } satisfies IDiscussionBoardMaintenanceSchedule.IUpdate,
      },
    );
  typia.assert(inProgressSchedule);
  TestValidator.equals(
    "status changed to in-progress",
    inProgressSchedule.status,
    "in-progress",
  );
  TestValidator.equals(
    "actual start time set",
    inProgressSchedule.actual_start_time,
    actualStartTime,
  );
  // 5. Transition status from 'in-progress' to 'completed' with actual end time
  const actualEndTime = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 minutes later
  const completedSchedule =
    await api.functional.discussionBoard.admin.maintenance_schedules.update(
      adminConnection,
      {
        scheduleId: initialSchedule.id,
        body: {
          status: "completed",
          actual_end_time: actualEndTime,
        } satisfies IDiscussionBoardMaintenanceSchedule.IUpdate,
      },
    );
  typia.assert(completedSchedule);
  TestValidator.equals(
    "status changed to completed",
    completedSchedule.status,
    "completed",
  );
  TestValidator.equals(
    "actual end time set",
    completedSchedule.actual_end_time,
    actualEndTime,
  );
  // 6. Validate actual duration calculation
  const startTime = new Date(actualStartTime).getTime();
  const endTime = new Date(actualEndTime).getTime();
  const expectedDurationMinutes = Math.round(
    (endTime - startTime) / (60 * 1000),
  );
  TestValidator.predicate(
    "actual duration calculated",
    completedSchedule.actual_duration_minutes === expectedDurationMinutes,
  );
}
