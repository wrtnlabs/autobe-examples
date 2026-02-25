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

export async function test_api_maintenance_schedule_status_transition(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create scheduled maintenance
  const scheduledStart = new Date(Date.now() + 3600000).toISOString(); // 1 hour from now
  const scheduledEnd = new Date(Date.now() + 7200000).toISOString(); // 2 hours from now
  const estimatedDuration = 60; // minutes
  const createBody = {
    maintenance_type: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    scheduled_start_time: scheduledStart,
    scheduled_end_time: scheduledEnd,
    estimated_duration_minutes: estimatedDuration satisfies number as number,
    impact_level: "medium",
    status: "scheduled",
    notes: RandomGenerator.paragraph({ sentences: 1 }),
  } satisfies IDiscussionBoardMaintenanceSchedule.ICreate;
  const maintenance =
    await api.functional.discussionBoard.admin.maintenance_schedules.create(
      adminConnection,
      { body: createBody },
    );
  typia.assert(maintenance);
  TestValidator.equals(
    "initial status scheduled",
    maintenance.status,
    "scheduled",
  );
  TestValidator.equals(
    "scheduled by admin",
    maintenance.scheduled_by_admin.id,
    adminAuth.id,
  );
  TestValidator.predicate(
    "performed_by_admin initially null",
    maintenance.performed_by_admin === null ||
      maintenance.performed_by_admin === undefined,
  );
  // 3. Transition to in-progress
  const inProgressStartTime = new Date().toISOString();
  const inProgressUpdate =
    await api.functional.discussionBoard.admin.maintenance_schedules.update(
      adminConnection,
      {
        scheduleId: maintenance.id,
        body: {
          status: "in-progress",
          notes: "Maintenance started",
        } satisfies IDiscussionBoardMaintenanceSchedule.IUpdate,
      },
    );
  typia.assert(inProgressUpdate);
  TestValidator.equals(
    "status in-progress",
    inProgressUpdate.status,
    "in-progress",
  );
  TestValidator.predicate(
    "has actual_start_time",
    inProgressUpdate.actual_start_time !== null &&
      inProgressUpdate.actual_start_time !== undefined,
  );
  // Wait 1 minute to simulate maintenance duration
  await new Promise((resolve) => setTimeout(resolve, 1000));
  // 4. Transition to completed
  const completedEndTime = new Date().toISOString();
  const completedUpdate =
    await api.functional.discussionBoard.admin.maintenance_schedules.update(
      adminConnection,
      {
        scheduleId: maintenance.id,
        body: {
          status: "completed",
          notes: "Maintenance completed successfully",
        } satisfies IDiscussionBoardMaintenanceSchedule.IUpdate,
      },
    );
  typia.assert(completedUpdate);
  TestValidator.equals("status completed", completedUpdate.status, "completed");
  TestValidator.predicate(
    "has actual_end_time",
    completedUpdate.actual_end_time !== null &&
      completedUpdate.actual_end_time !== undefined,
  );
  TestValidator.predicate(
    "has actual_duration_minutes",
    completedUpdate.actual_duration_minutes !== null &&
      completedUpdate.actual_duration_minutes !== undefined,
  );
  // Validate duration calculation
  if (completedUpdate.actual_start_time && completedUpdate.actual_end_time) {
    const start = new Date(completedUpdate.actual_start_time).getTime();
    const end = new Date(completedUpdate.actual_end_time).getTime();
    const durationMinutes = Math.round((end - start) / 60000);
    TestValidator.equals(
      "actual duration matches",
      completedUpdate.actual_duration_minutes,
      durationMinutes,
    );
  }
  TestValidator.equals(
    "performed_by_admin set",
    completedUpdate.performed_by_admin?.id,
    adminAuth.id,
  );
  // 5. Test timeline constraints
  const scheduledStartTime = new Date(
    maintenance.scheduled_start_time,
  ).getTime();
  const scheduledEndTime = new Date(maintenance.scheduled_end_time).getTime();
  TestValidator.predicate(
    "scheduled_end_time after scheduled_start_time",
    scheduledEndTime > scheduledStartTime,
  );
  // 6. Test cancelling a new scheduled maintenance
  const cancelBody = {
    maintenance_type: "System update",
    description: "Test cancellation",
    scheduled_start_time: new Date(Date.now() + 1800000).toISOString(),
    scheduled_end_time: new Date(Date.now() + 3600000).toISOString(),
    estimated_duration_minutes: 30 satisfies number as number,
    impact_level: "low",
    status: "scheduled",
  } satisfies IDiscussionBoardMaintenanceSchedule.ICreate;
  const cancelMaintenance =
    await api.functional.discussionBoard.admin.maintenance_schedules.create(
      adminConnection,
      { body: cancelBody },
    );
  typia.assert(cancelMaintenance);
  const cancelledUpdate =
    await api.functional.discussionBoard.admin.maintenance_schedules.update(
      adminConnection,
      {
        scheduleId: cancelMaintenance.id,
        body: {
          status: "cancelled",
          notes: "Maintenance cancelled due to conflict",
        } satisfies IDiscussionBoardMaintenanceSchedule.IUpdate,
      },
    );
  typia.assert(cancelledUpdate);
  TestValidator.equals("status cancelled", cancelledUpdate.status, "cancelled");
  // 7. Test invalid transition (should fail)
  await TestValidator.error(
    "cannot transition from completed back to in-progress",
    async () => {
      await api.functional.discussionBoard.admin.maintenance_schedules.update(
        adminConnection,
        {
          scheduleId: maintenance.id,
          body: {
            status: "in-progress",
          } satisfies IDiscussionBoardMaintenanceSchedule.IUpdate,
        },
      );
    },
  );
}
