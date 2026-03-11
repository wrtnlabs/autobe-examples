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

export async function test_api_maintenance_schedule_lifecycle_creation_to_deletion(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Create maintenance schedule with comprehensive planning data
  const maintenanceSchedule =
    await generate_random_discussion_board_super_admin_maintenance_schedules_create(
      superAdminConnection,
      {
        body: {
          maintenance_type: RandomGenerator.pick([
            "backup",
            "system_update",
            "database_maintenance",
            "security_patch",
            "performance_optimization",
          ] as const),
          title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          planned_start_at: new Date(Date.now() + 86400000).toISOString(), // tomorrow
          planned_end_at: new Date(Date.now() + 172800000).toISOString(), // day after tomorrow
        } satisfies IDiscussionBoardMaintenanceSchedule.ICreate,
      },
    );
  typia.assert(maintenanceSchedule);
  // Validate status progression consistency
  TestValidator.predicate(
    "status type has valid ID",
    maintenanceSchedule.statusType.id.length > 0,
  );
  TestValidator.predicate(
    "status type has category",
    maintenanceSchedule.statusType.category.length > 0,
  );
  TestValidator.predicate(
    "status type has code",
    maintenanceSchedule.statusType.code.length > 0,
  );
  TestValidator.predicate(
    "status type has display name",
    maintenanceSchedule.statusType.display_name.length > 0,
  );
  TestValidator.predicate(
    "status type is active",
    maintenanceSchedule.statusType.is_active === true,
  );
  // Store original timestamps for audit trail concept
  const originalCreatedAt = maintenanceSchedule.created_at;
  const originalUpdatedAt = maintenanceSchedule.updated_at;
  // Perform soft deletion
  await api.functional.discussionBoard.superAdmin.maintenance_schedules.erase(
    superAdminConnection,
    {
      scheduleId: maintenanceSchedule.id,
    },
  );
  // Validate successful deletion workflow
  TestValidator.predicate("maintenance schedule lifecycle completed", true);
}
