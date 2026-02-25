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
 * Test retrieval of a maintenance schedule that has been completed with actual timing information.
 * 1. Authenticate as an administrator
 * 2. Create a maintenance schedule with scheduled timing
 * 3. Update the schedule to mark as completed
 * 4. Retrieve the completed schedule and validate completed fields
 */
export async function test_api_maintenance_schedule_completed_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
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
  // 2. Create a maintenance schedule using utility function
  const schedule =
    await generate_random_discussion_board_admin_maintenance_schedules_create(
      adminConnection,
      {
        body: {
          status: "scheduled",
        },
      },
    );
  typia.assert(schedule);
  // 3. Update the schedule to mark as completed
  // Note: IUpdate doesn't include actual_start_time or actual_end_time fields
  // So we only update the status field and let server handle timing
  const updateBody = {
    status: "completed",
  } satisfies IDiscussionBoardMaintenanceSchedule.IUpdate;
  const updatedSchedule =
    await api.functional.discussionBoard.admin.maintenance_schedules.update(
      adminConnection,
      {
        scheduleId: schedule.id,
        body: updateBody,
      },
    );
  typia.assert(updatedSchedule);
  // 4. Retrieve and validate completed schedule
  const retrieved =
    await api.functional.discussionBoard.admin.maintenance_schedules.at(
      adminConnection,
      { scheduleId: schedule.id },
    );
  typia.assert(retrieved);
  // Validate status is completed
  TestValidator.equals(
    "status should be completed",
    retrieved.status,
    "completed",
  );
  // Scheduled admin should be populated
  TestValidator.predicate(
    "scheduled_by_admin should exist",
    () => retrieved.scheduled_by_admin !== undefined,
  );
  TestValidator.equals(
    "scheduled_by_admin should have id",
    !!retrieved.scheduled_by_admin.id,
    true,
  );
  TestValidator.equals(
    "scheduled_by_admin should have display_name",
    !!retrieved.scheduled_by_admin.display_name,
    true,
  );
  // If actual timing fields exist (populated by server), validate them
  if (
    retrieved.actual_start_time !== null &&
    retrieved.actual_start_time !== undefined
  ) {
    TestValidator.predicate(
      "actual_start_time should be valid ISO string",
      () => {
        const d = new Date(retrieved.actual_start_time!);
        return !isNaN(d.getTime());
      },
    );
  }
  if (
    retrieved.actual_end_time !== null &&
    retrieved.actual_end_time !== undefined
  ) {
    TestValidator.predicate(
      "actual_end_time should be valid ISO string",
      () => {
        const d = new Date(retrieved.actual_end_time!);
        return !isNaN(d.getTime());
      },
    );
  }
  // If both actual times and duration exist, validate calculation
  if (
    retrieved.actual_start_time &&
    retrieved.actual_end_time &&
    retrieved.actual_duration_minutes !== null &&
    retrieved.actual_duration_minutes !== undefined
  ) {
    const startMs = new Date(retrieved.actual_start_time).getTime();
    const endMs = new Date(retrieved.actual_end_time).getTime();
    const calculatedMinutes = Math.round((endMs - startMs) / (1000 * 60));
    TestValidator.equals(
      "actual_duration_minutes should match calculated difference",
      retrieved.actual_duration_minutes,
      calculatedMinutes,
    );
  }
  // Check performed_by_admin if exists (may be populated by server when status changes to completed)
  if (
    retrieved.performed_by_admin !== null &&
    retrieved.performed_by_admin !== undefined
  ) {
    TestValidator.equals(
      "performed_by_admin should have id",
      !!retrieved.performed_by_admin.id,
      true,
    );
    TestValidator.equals(
      "performed_by_admin should have display_name",
      !!retrieved.performed_by_admin.display_name,
      true,
    );
  }
}
