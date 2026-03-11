import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardMaintenanceSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMaintenanceSchedule";
import type { IDiscussionBoardStatusType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusType";
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

export async function test_api_maintenance_schedule_update_actual_execution_tracking(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Create a maintenance schedule
  const maintenanceSchedule =
    await generate_random_discussion_board_admin_maintenance_schedules_create(
      adminConnection,
      {
        body: {
          maintenance_type: "backup",
          title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          planned_start_at: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
          planned_end_at: new Date(Date.now() + 7200000).toISOString(), // 2 hours from now
        } satisfies IDiscussionBoardMaintenanceSchedule.ICreate,
      },
    );
  typia.assert(maintenanceSchedule);
  // Update with actual execution timestamps
  const actualStartAt = new Date(Date.now() - 1800000).toISOString(); // 30 minutes ago
  const actualEndAt = new Date(Date.now() - 600000).toISOString(); // 10 minutes ago
  const updatedSchedule =
    await api.functional.discussionBoard.admin.maintenance_schedules.update(
      adminConnection,
      {
        scheduleId: maintenanceSchedule.id,
        body: {
          actual_start_at: actualStartAt,
          actual_end_at: actualEndAt,
        } satisfies IDiscussionBoardMaintenanceSchedule.IUpdate,
      },
    );
  typia.assert(updatedSchedule);
  // Validate the update - only structural checks, no business logic validation
  TestValidator.equals(
    "schedule ID unchanged",
    updatedSchedule.id,
    maintenanceSchedule.id,
  );
  TestValidator.equals(
    "actual_start_at set correctly",
    updatedSchedule.actual_start_at,
    actualStartAt,
  );
  TestValidator.equals(
    "actual_end_at set correctly",
    updatedSchedule.actual_end_at,
    actualEndAt,
  );
  TestValidator.equals(
    "planned_start_at unchanged",
    updatedSchedule.planned_start_at,
    maintenanceSchedule.planned_start_at,
  );
  TestValidator.equals(
    "planned_end_at unchanged",
    updatedSchedule.planned_end_at,
    maintenanceSchedule.planned_end_at,
  );
  TestValidator.equals(
    "maintenance_type unchanged",
    updatedSchedule.maintenance_type,
    maintenanceSchedule.maintenance_type,
  );
  TestValidator.equals(
    "title unchanged",
    updatedSchedule.title,
    maintenanceSchedule.title,
  );
  TestValidator.equals(
    "description unchanged",
    updatedSchedule.description,
    maintenanceSchedule.description,
  );
}
