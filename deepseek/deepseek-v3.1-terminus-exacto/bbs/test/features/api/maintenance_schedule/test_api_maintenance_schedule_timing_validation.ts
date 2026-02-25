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

export async function test_api_maintenance_schedule_timing_validation(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create initial maintenance schedule
  const now = new Date();
  const futureStart = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
  const futureEnd = new Date(futureStart.getTime() + 30 * 60 * 1000); // 30 minutes duration
  const schedule =
    await generate_random_discussion_board_super_admin_maintenance_schedules_create(
      superAdminConnection,
      {
        body: {
          maintenance_type: "system_update",
          description: RandomGenerator.paragraph({ sentences: 3 }),
          scheduled_start_time: futureStart.toISOString(),
          scheduled_end_time: futureEnd.toISOString(),
          estimated_duration_minutes: 30,
          impact_level: "low",
          status: "scheduled",
          notes: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardMaintenanceSchedule.ICreate,
      },
    );
  typia.assert(schedule);
  // Test 1: scheduled_end_time before scheduled_start_time
  await TestValidator.error(
    "should reject end time before start time",
    async () => {
      await api.functional.discussionBoard.superAdmin.maintenance_schedules.update(
        superAdminConnection,
        {
          scheduleId: schedule.id,
          body: {
            scheduled_end_time: futureStart.toISOString(),
            scheduled_start_time: futureEnd.toISOString(),
          } satisfies IDiscussionBoardMaintenanceSchedule.IUpdate,
        },
      );
    },
  );
  // Test 2: overlapping maintenance window (end time overlaps with existing schedule)
  await TestValidator.error(
    "should reject overlapping maintenance window",
    async () => {
      await api.functional.discussionBoard.superAdmin.maintenance_schedules.update(
        superAdminConnection,
        {
          scheduleId: schedule.id,
          body: {
            scheduled_start_time: new Date(
              futureStart.getTime() - 15 * 60 * 1000,
            ).toISOString(), // 15 minutes before original start
            scheduled_end_time: new Date(
              futureStart.getTime() + 15 * 60 * 1000,
            ).toISOString(), // 15 minutes after original start (overlap)
          } satisfies IDiscussionBoardMaintenanceSchedule.IUpdate,
        },
      );
    },
  );
  // Test 3: Valid update should succeed
  const validUpdate =
    await api.functional.discussionBoard.superAdmin.maintenance_schedules.update(
      superAdminConnection,
      {
        scheduleId: schedule.id,
        body: {
          description: "Updated description",
          notes: "Updated notes",
        } satisfies IDiscussionBoardMaintenanceSchedule.IUpdate,
      },
    );
  typia.assert(validUpdate);
  TestValidator.equals(
    "description updated",
    validUpdate.description,
    "Updated description",
  );
  TestValidator.equals("notes updated", validUpdate.notes, "Updated notes");
}
