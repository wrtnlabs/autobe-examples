import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMaintenanceSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMaintenanceSchedule";
import type { IDiscussionBoardStatusType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusType";
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

export async function test_api_maintenance_execution_start_complete_lifecycle(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create maintenance schedule
  const maintenanceSchedule =
    await generate_random_discussion_board_super_admin_maintenance_schedules_create(
      superAdminConnection,
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
  // Start maintenance execution
  const startTime = new Date().toISOString();
  const startedMaintenance =
    await api.functional.discussionBoard.superAdmin.maintenance.execution.execute(
      superAdminConnection,
      {
        body: {
          actual_start_at: startTime,
        } satisfies IDiscussionBoardMaintenanceSchedule.IUpdate,
      },
    );
  typia.assert(startedMaintenance);
  // Verify maintenance started correctly
  TestValidator.equals(
    "maintenance schedule id matches",
    startedMaintenance.id,
    maintenanceSchedule.id,
  );
  TestValidator.equals(
    "actual_start_at is set",
    startedMaintenance.actual_start_at,
    startTime,
  );
  TestValidator.predicate(
    "statusType exists",
    startedMaintenance.statusType !== undefined,
  );
  TestValidator.predicate(
    "statusType has code",
    startedMaintenance.statusType.code !== undefined,
  );
  TestValidator.predicate(
    "statusType has display_name",
    startedMaintenance.statusType.display_name !== undefined,
  );
  // Complete maintenance execution
  const endTime = new Date(Date.now() + 1800000).toISOString(); // 30 minutes after start
  const completedMaintenance =
    await api.functional.discussionBoard.superAdmin.maintenance.execution.execute(
      superAdminConnection,
      {
        body: {
          actual_end_at: endTime,
        } satisfies IDiscussionBoardMaintenanceSchedule.IUpdate,
      },
    );
  typia.assert(completedMaintenance);
  // Verify maintenance completed correctly
  TestValidator.equals(
    "maintenance schedule id remains same",
    completedMaintenance.id,
    maintenanceSchedule.id,
  );
  TestValidator.equals(
    "actual_start_at remains",
    completedMaintenance.actual_start_at,
    startTime,
  );
  TestValidator.equals(
    "actual_end_at is set",
    completedMaintenance.actual_end_at,
    endTime,
  );
  TestValidator.predicate(
    "actual_start_at <= actual_end_at",
    new Date(startTime) <= new Date(endTime),
  );
  TestValidator.predicate(
    "statusType exists",
    completedMaintenance.statusType !== undefined,
  );
  TestValidator.predicate(
    "statusType has code",
    completedMaintenance.statusType.code !== undefined,
  );
  TestValidator.predicate(
    "statusType has display_name",
    completedMaintenance.statusType.display_name !== undefined,
  );
  // Final validation of the complete lifecycle
  TestValidator.equals(
    "planned_start_at unchanged",
    completedMaintenance.planned_start_at,
    maintenanceSchedule.planned_start_at,
  );
  TestValidator.equals(
    "planned_end_at unchanged",
    completedMaintenance.planned_end_at,
    maintenanceSchedule.planned_end_at,
  );
  TestValidator.equals(
    "maintenance_type unchanged",
    completedMaintenance.maintenance_type,
    maintenanceSchedule.maintenance_type,
  );
  TestValidator.equals(
    "title unchanged",
    completedMaintenance.title,
    maintenanceSchedule.title,
  );
  TestValidator.equals(
    "description unchanged",
    completedMaintenance.description,
    maintenanceSchedule.description,
  );
}
