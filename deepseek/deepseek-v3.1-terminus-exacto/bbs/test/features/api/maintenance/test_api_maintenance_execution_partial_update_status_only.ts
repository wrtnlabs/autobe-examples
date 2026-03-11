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
 * Test partial updates to maintenance execution by modifying only the status without changing timestamps.
 * 1. Create super admin connection
 * 2. Create maintenance schedule for security patch operation
 * 3. Execute partial updates simulating status progression through available fields
 * 4. Verify timestamp preservation and data integrity
 */
export async function test_api_maintenance_execution_partial_update_status_only(
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
  // 2. Create maintenance schedule for security patch operation
  const maintenanceSchedule =
    await generate_random_discussion_board_super_admin_maintenance_schedules_create(
      superAdminConnection,
      {
        body: {
          maintenance_type: "security_patch",
          title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          planned_start_at: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
          planned_end_at: new Date(Date.now() + 7200000).toISOString(), // 2 hours from now
        } satisfies IDiscussionBoardMaintenanceSchedule.ICreate,
      },
    );
  typia.assert(maintenanceSchedule);
  // Store original values for comparison
  const originalPlannedStartAt = maintenanceSchedule.planned_start_at;
  const originalPlannedEndAt = maintenanceSchedule.planned_end_at;
  const originalCreatedAt = maintenanceSchedule.created_at;
  const originalUpdatedAt = maintenanceSchedule.updated_at;
  const originalMaintenanceType = maintenanceSchedule.maintenance_type;
  const originalTitle = maintenanceSchedule.title;
  // 3. Execute partial update simulating status progression through actual timestamps
  // Since status_type_id is not available in IUpdate, we'll test partial updates
  // using actual_start_at and actual_end_at which represent execution progression
  const firstUpdate: IDiscussionBoardMaintenanceSchedule.IUpdate = {
    actual_start_at: new Date().toISOString(), // Mark as started
  };
  const updatedSchedule =
    await api.functional.discussionBoard.superAdmin.maintenance.execution.execute(
      superAdminConnection,
      {
        body: firstUpdate,
      },
    );
  typia.assert(updatedSchedule);
  // 4. Verify timestamp preservation and partial update behavior
  TestValidator.equals(
    "planned_start_at should be preserved during partial update",
    updatedSchedule.planned_start_at,
    originalPlannedStartAt,
  );
  TestValidator.equals(
    "planned_end_at should be preserved during partial update",
    updatedSchedule.planned_end_at,
    originalPlannedEndAt,
  );
  TestValidator.equals(
    "created_at should be preserved",
    updatedSchedule.created_at,
    originalCreatedAt,
  );
  TestValidator.notEquals(
    "updated_at should be modified after update",
    updatedSchedule.updated_at,
    originalUpdatedAt,
  );
  TestValidator.equals(
    "maintenance_type should be preserved",
    updatedSchedule.maintenance_type,
    originalMaintenanceType,
  );
  TestValidator.equals(
    "title should be preserved",
    updatedSchedule.title,
    originalTitle,
  );
  TestValidator.predicate(
    "actual_start_at should be set",
    updatedSchedule.actual_start_at !== null &&
      updatedSchedule.actual_start_at !== undefined,
  );
  // Verify that statusType information is present and valid
  TestValidator.predicate(
    "statusType should be present",
    updatedSchedule.statusType !== undefined,
  );
  TestValidator.predicate(
    "statusType should have valid structure",
    typeof updatedSchedule.statusType.id === "string" &&
      typeof updatedSchedule.statusType.category === "string" &&
      typeof updatedSchedule.statusType.code === "string" &&
      typeof updatedSchedule.statusType.display_name === "string" &&
      typeof updatedSchedule.statusType.display_order === "number" &&
      typeof updatedSchedule.statusType.is_active === "boolean",
  );
  // Test second partial update to simulate completion
  const secondUpdate: IDiscussionBoardMaintenanceSchedule.IUpdate = {
    actual_end_at: new Date(Date.now() + 1800000).toISOString(), // Mark as completed 30 minutes later
  };
  const completedSchedule =
    await api.functional.discussionBoard.superAdmin.maintenance.execution.execute(
      superAdminConnection,
      {
        body: secondUpdate,
      },
    );
  typia.assert(completedSchedule);
  // Verify that all original values are still preserved
  TestValidator.equals(
    "planned_start_at should remain unchanged after second update",
    completedSchedule.planned_start_at,
    originalPlannedStartAt,
  );
  TestValidator.equals(
    "planned_end_at should remain unchanged after second update",
    completedSchedule.planned_end_at,
    originalPlannedEndAt,
  );
  TestValidator.equals(
    "created_at should remain unchanged",
    completedSchedule.created_at,
    originalCreatedAt,
  );
  TestValidator.predicate(
    "actual_start_at should remain set",
    completedSchedule.actual_start_at !== null &&
      completedSchedule.actual_start_at !== undefined,
  );
  TestValidator.predicate(
    "actual_end_at should be set",
    completedSchedule.actual_end_at !== null &&
      completedSchedule.actual_end_at !== undefined,
  );
  // Final validation of data integrity
  TestValidator.equals(
    "maintenance_type integrity check",
    completedSchedule.maintenance_type,
    "security_patch",
  );
  TestValidator.predicate(
    "title integrity check",
    completedSchedule.title.length > 0,
  );
}
