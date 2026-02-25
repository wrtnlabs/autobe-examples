import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardMaintenanceSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMaintenanceSchedule";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
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

export async function test_api_maintenance_schedule_completed_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(authorized);
  // 2. Create maintenance schedule with 'scheduled' status using utility function
  const createdSchedule =
    await generate_random_discussion_board_super_admin_maintenance_schedules_create(
      superAdminConnection,
      {
        body: {
          maintenance_type: "system update",
          description: RandomGenerator.paragraph({ sentences: 3 }),
          scheduled_start_time: new Date(Date.now() + 3600000).toISOString(),
          scheduled_end_time: new Date(Date.now() + 7200000).toISOString(),
          estimated_duration_minutes: 60,
          impact_level: "low",
          status: "scheduled",
          notes: "Initial maintenance schedule",
        } satisfies DeepPartial<IDiscussionBoardMaintenanceSchedule.ICreate>,
      },
    );
  typia.assert(createdSchedule);
  // 3. Update maintenance schedule to 'completed' status
  const actualStartTime = new Date(Date.now() - 3600000).toISOString();
  const actualEndTime = new Date(Date.now() - 1800000).toISOString();
  // Calculate actual duration in minutes
  const actualDurationMinutes = Math.round(
    (new Date(actualEndTime).getTime() - new Date(actualStartTime).getTime()) /
      (1000 * 60),
  );
  const updateBody = {
    status: "completed",
    notes: "Maintenance completed successfully",
  } satisfies IDiscussionBoardMaintenanceSchedule.IUpdate;
  const updatedSchedule =
    await api.functional.discussionBoard.superAdmin.maintenance_schedules.update(
      superAdminConnection,
      {
        scheduleId: createdSchedule.id,
        body: updateBody,
      },
    );
  typia.assert(updatedSchedule);
  // 4. Retrieve the updated maintenance schedule
  const retrievedSchedule =
    await api.functional.discussionBoard.superAdmin.maintenance_schedules.at(
      superAdminConnection,
      { scheduleId: createdSchedule.id },
    );
  typia.assert(retrievedSchedule);
  // 5. Validate the completed maintenance schedule
  TestValidator.equals(
    "status should be completed",
    retrievedSchedule.status,
    "completed",
  );
  TestValidator.notEquals(
    "actual_start_time should not be null",
    retrievedSchedule.actual_start_time,
    null,
  );
  TestValidator.notEquals(
    "actual_end_time should not be null",
    retrievedSchedule.actual_end_time,
    null,
  );
  TestValidator.equals(
    "actual_duration_minutes should match calculated value",
    retrievedSchedule.actual_duration_minutes,
    actualDurationMinutes,
  );
  TestValidator.notEquals(
    "scheduled_by_admin should persist",
    retrievedSchedule.scheduled_by_admin,
    null,
  );
  // 6. Verify business rule: completed maintenance cannot be changed to in-progress or cancelled
  await TestValidator.error(
    "should not allow changing completed status to in-progress",
    async () => {
      await api.functional.discussionBoard.superAdmin.maintenance_schedules.update(
        superAdminConnection,
        {
          scheduleId: createdSchedule.id,
          body: {
            status: "in-progress",
          } satisfies IDiscussionBoardMaintenanceSchedule.IUpdate,
        },
      );
    },
  );
  await TestValidator.error(
    "should not allow changing completed status to cancelled",
    async () => {
      await api.functional.discussionBoard.superAdmin.maintenance_schedules.update(
        superAdminConnection,
        {
          scheduleId: createdSchedule.id,
          body: {
            status: "cancelled",
          } satisfies IDiscussionBoardMaintenanceSchedule.IUpdate,
        },
      );
    },
  );
}