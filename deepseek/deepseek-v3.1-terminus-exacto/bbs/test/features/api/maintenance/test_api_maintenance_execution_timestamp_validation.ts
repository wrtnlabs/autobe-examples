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

/**
 * Test timestamp validation logic for maintenance execution updates.
 * 1. Create super admin account and authenticate
 * 2. Create a maintenance schedule for database maintenance
 * 3. Test invalid timestamp combinations:
 *    - actual_end_at before actual_start_at
 *    - actual_end_at without actual_start_at
 *    - timestamps outside planned maintenance window
 * 4. Verify system rejects illogical timestamp sequences
 */
export async function test_api_maintenance_execution_timestamp_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 2. Create maintenance schedule
  const maintenanceSchedule =
    await generate_random_discussion_board_super_admin_maintenance_schedules_create(
      superAdminConnection,
      {
        body: {
          maintenance_type: "database_maintenance",
          title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          planned_start_at: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
          planned_end_at: new Date(Date.now() + 7200000).toISOString(), // 2 hours from now
        } satisfies IDiscussionBoardMaintenanceSchedule.ICreate,
      },
    );
  typia.assert(maintenanceSchedule);
  // 3. Test invalid timestamp combinations
  // Test 1: actual_end_at before actual_start_at (business logic validation)
  await TestValidator.error(
    "should reject actual_end_at before actual_start_at",
    async () => {
      await api.functional.discussionBoard.superAdmin.maintenance.execution.execute(
        superAdminConnection,
        {
          body: {
            actual_start_at: new Date(Date.now() + 5400000).toISOString(), // 1.5 hours from now
            actual_end_at: new Date(Date.now() + 4800000).toISOString(), // 1.33 hours from now (before start)
          } satisfies IDiscussionBoardMaintenanceSchedule.IUpdate,
        },
      );
    },
  );
  // Test 2: actual_end_at without actual_start_at (business logic validation)
  await TestValidator.error(
    "should reject actual_end_at without actual_start_at",
    async () => {
      await api.functional.discussionBoard.superAdmin.maintenance.execution.execute(
        superAdminConnection,
        {
          body: {
            actual_end_at: new Date(Date.now() + 6000000).toISOString(), // 1.67 hours from now
          } satisfies IDiscussionBoardMaintenanceSchedule.IUpdate,
        },
      );
    },
  );
  // Test 3: timestamps outside planned maintenance window (business logic validation)
  await TestValidator.error(
    "should reject timestamps outside planned window",
    async () => {
      await api.functional.discussionBoard.superAdmin.maintenance.execution.execute(
        superAdminConnection,
        {
          body: {
            actual_start_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago (before planned start)
            actual_end_at: new Date(Date.now() + 10800000).toISOString(), // 3 hours from now (after planned end)
          } satisfies IDiscussionBoardMaintenanceSchedule.IUpdate,
        },
      );
    },
  );
  // Test 4: valid timestamp sequence should succeed
  const validExecution =
    await api.functional.discussionBoard.superAdmin.maintenance.execution.execute(
      superAdminConnection,
      {
        body: {
          actual_start_at: new Date(Date.now() + 5400000).toISOString(), // within planned window
          actual_end_at: new Date(Date.now() + 6000000).toISOString(), // after start, within planned window
        } satisfies IDiscussionBoardMaintenanceSchedule.IUpdate,
      },
    );
  typia.assert(validExecution);
  // Validate logical timestamp relationships
  TestValidator.predicate(
    "actual_start_at should be before actual_end_at",
    new Date(validExecution.actual_start_at!).getTime() <
      new Date(validExecution.actual_end_at!).getTime(),
  );
  TestValidator.predicate(
    "actual timestamps should be within planned window",
    new Date(validExecution.actual_start_at!).getTime() >=
      new Date(maintenanceSchedule.planned_start_at).getTime() &&
      new Date(validExecution.actual_end_at!).getTime() <=
        new Date(maintenanceSchedule.planned_end_at).getTime(),
  );
}
