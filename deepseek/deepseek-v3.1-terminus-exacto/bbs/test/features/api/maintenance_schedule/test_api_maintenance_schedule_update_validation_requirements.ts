import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardMaintenanceSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMaintenanceSchedule";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_admin_maintenance_schedules_create } from "../../../generate/generate_random_discussion_board_admin_maintenance_schedules_create";
import { prepare_random_discussion_board_maintenance_schedule } from "../../../prepare/prepare_random_discussion_board_maintenance_schedule";

export async function test_api_maintenance_schedule_update_validation_requirements(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  // Create a maintenance schedule for testing
  const schedule =
    await generate_random_discussion_board_admin_maintenance_schedules_create(
      adminConnection,
      {
        body: {
          maintenance_type: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          scheduled_start_time: new Date(Date.now() + 86400000).toISOString(),
          scheduled_end_time: new Date(Date.now() + 172800000).toISOString(),
          estimated_duration_minutes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          impact_level: RandomGenerator.pick([
            "low",
            "medium",
            "high",
            "critical",
          ] as const),
          status: "scheduled",
          notes: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardMaintenanceSchedule.ICreate,
      },
    );
  typia.assert(schedule);
  // Test 1: Non-admin user should not be able to update maintenance schedule
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    },
  });
  await TestValidator.error(
    "non-admin user cannot update maintenance schedule",
    async () => {
      await api.functional.discussionBoard.admin.maintenance_schedules.update(
        userConnection,
        {
          scheduleId: schedule.id,
          body: {
            maintenance_type: "Updated Maintenance",
          } satisfies IDiscussionBoardMaintenanceSchedule.IUpdate,
        },
      );
    },
  );
  // Test 2: Valid update with partial fields
  const updateData: IDiscussionBoardMaintenanceSchedule.IUpdate = {
    maintenance_type: "Updated " + RandomGenerator.paragraph({ sentences: 1 }),
    description: "Updated " + RandomGenerator.paragraph({ sentences: 2 }),
    impact_level: RandomGenerator.pick([
      "low",
      "medium",
      "high",
      "critical",
    ] as const),
    notes: "Updated notes",
  };
  const updatedSchedule =
    await api.functional.discussionBoard.admin.maintenance_schedules.update(
      adminConnection,
      {
        scheduleId: schedule.id,
        body: updateData,
      },
    );
  typia.assert(updatedSchedule);
  // Verify updates
  TestValidator.equals(
    "maintenance type updated",
    updatedSchedule.maintenance_type,
    updateData.maintenance_type,
  );
  TestValidator.equals(
    "description updated",
    updatedSchedule.description,
    updateData.description,
  );
  TestValidator.equals(
    "impact level updated",
    updatedSchedule.impact_level,
    updateData.impact_level,
  );
  TestValidator.equals(
    "notes updated",
    updatedSchedule.notes,
    updateData.notes,
  );
  // Test 3: Update with valid timing
  const validStartTime = new Date(Date.now() + 259200000).toISOString();
  const validEndTime = new Date(Date.now() + 345600000).toISOString();
  const timingUpdate =
    await api.functional.discussionBoard.admin.maintenance_schedules.update(
      adminConnection,
      {
        scheduleId: schedule.id,
        body: {
          scheduled_start_time: validStartTime,
          scheduled_end_time: validEndTime,
        } satisfies IDiscussionBoardMaintenanceSchedule.IUpdate,
      },
    );
  typia.assert(timingUpdate);
  TestValidator.equals(
    "start time updated",
    timingUpdate.scheduled_start_time,
    validStartTime,
  );
  TestValidator.equals(
    "end time updated",
    timingUpdate.scheduled_end_time,
    validEndTime,
  );
  // Test 4: Non-existent schedule ID using clearly invalid UUID format
  const nonExistentId =
    "00000000-0000-0000-0000-000000000000" satisfies string &
      tags.Format<"uuid"> as string & tags.Format<"uuid">;
  await TestValidator.error("non-existent schedule should fail", async () => {
    await api.functional.discussionBoard.admin.maintenance_schedules.update(
      adminConnection,
      {
        scheduleId: nonExistentId,
        body: {
          maintenance_type: "Should Fail",
        } satisfies IDiscussionBoardMaintenanceSchedule.IUpdate,
      },
    );
  });
  // Test 5: Status transition validation
  const statusUpdate =
    await api.functional.discussionBoard.admin.maintenance_schedules.update(
      adminConnection,
      {
        scheduleId: schedule.id,
        body: {
          status: "in-progress",
        } satisfies IDiscussionBoardMaintenanceSchedule.IUpdate,
      },
    );
  typia.assert(statusUpdate);
  TestValidator.equals("status updated", statusUpdate.status, "in-progress");
  // Test 6: Empty update should preserve existing data
  const emptyUpdate =
    await api.functional.discussionBoard.admin.maintenance_schedules.update(
      adminConnection,
      {
        scheduleId: schedule.id,
        body: {} satisfies IDiscussionBoardMaintenanceSchedule.IUpdate,
      },
    );
  typia.assert(emptyUpdate);
  TestValidator.equals(
    "empty update preserves maintenance type",
    emptyUpdate.maintenance_type,
    statusUpdate.maintenance_type,
  );
  TestValidator.equals(
    "empty update preserves description",
    emptyUpdate.description,
    statusUpdate.description,
  );
  TestValidator.equals(
    "empty update preserves status",
    emptyUpdate.status,
    statusUpdate.status,
  );
}
