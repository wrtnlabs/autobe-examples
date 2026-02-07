import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardMaintenanceSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMaintenanceSchedule";
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

export async function test_api_maintenance_schedule_creation_future_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 2. Test valid maintenance schedule creation
  const futureStartTime = new Date(Date.now() + 3600000).toISOString(); // 1 hour from now
  const futureEndTime = new Date(Date.now() + 7200000).toISOString(); // 2 hours from now
  const validDuration = 60; // 60 minutes difference
  const validSchedule =
    await generate_random_discussion_board_super_admin_maintenance_schedules_create(
      superAdminConnection,
      {
        body: {
          maintenance_type: "system_update",
          description: RandomGenerator.paragraph({ sentences: 3 }),
          scheduled_start_time: futureStartTime,
          scheduled_end_time: futureEndTime,
          estimated_duration_minutes: validDuration,
          impact_level: "low",
          notes: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardMaintenanceSchedule.ICreate,
      },
    );
  typia.assert(validSchedule);
  TestValidator.equals(
    "scheduled_start_time matches",
    validSchedule.scheduled_start_time,
    futureStartTime,
  );
  TestValidator.equals(
    "scheduled_end_time matches",
    validSchedule.scheduled_end_time,
    futureEndTime,
  );
  TestValidator.equals(
    "estimated_duration_minutes matches",
    validSchedule.estimated_duration_minutes,
    validDuration,
  );
  // 3. Test invalid: scheduled_start_time in the past
  await TestValidator.error(
    "should reject past scheduled_start_time",
    async () => {
      await generate_random_discussion_board_super_admin_maintenance_schedules_create(
        superAdminConnection,
        {
          body: {
            maintenance_type: "system_update",
            description: RandomGenerator.paragraph({ sentences: 3 }),
            scheduled_start_time: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
            scheduled_end_time: futureEndTime,
            estimated_duration_minutes: validDuration,
            impact_level: "low",
          } satisfies IDiscussionBoardMaintenanceSchedule.ICreate,
        },
      );
    },
  );
  // 4. Test invalid: scheduled_end_time before scheduled_start_time
  await TestValidator.error(
    "should reject scheduled_end_time before scheduled_start_time",
    async () => {
      await generate_random_discussion_board_super_admin_maintenance_schedules_create(
        superAdminConnection,
        {
          body: {
            maintenance_type: "system_update",
            description: RandomGenerator.paragraph({ sentences: 3 }),
            scheduled_start_time: futureEndTime,
            scheduled_end_time: futureStartTime, // end before start
            estimated_duration_minutes: validDuration,
            impact_level: "low",
          } satisfies IDiscussionBoardMaintenanceSchedule.ICreate,
        },
      );
    },
  );
  // 5. Test invalid: estimated_duration_minutes not matching time difference
  await TestValidator.error(
    "should reject mismatched estimated_duration_minutes",
    async () => {
      await generate_random_discussion_board_super_admin_maintenance_schedules_create(
        superAdminConnection,
        {
          body: {
            maintenance_type: "system_update",
            description: RandomGenerator.paragraph({ sentences: 3 }),
            scheduled_start_time: futureStartTime,
            scheduled_end_time: futureEndTime,
            estimated_duration_minutes: 30, // incorrect duration (should be 60)
            impact_level: "low",
          } satisfies IDiscussionBoardMaintenanceSchedule.ICreate,
        },
      );
    },
  );
}
