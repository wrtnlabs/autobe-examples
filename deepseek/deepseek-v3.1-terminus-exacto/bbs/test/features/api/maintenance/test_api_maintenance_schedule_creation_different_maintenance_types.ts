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

export async function test_api_maintenance_schedule_creation_different_maintenance_types(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Define all valid maintenance types
  const maintenanceTypes = [
    "backup",
    "system_update",
    "database_maintenance",
    "security_patch",
    "performance_optimization",
  ] as const;
  // Test each maintenance type
  for (const maintenanceType of maintenanceTypes) {
    // Create maintenance schedule for current type
    const schedule =
      await generate_random_discussion_board_super_admin_maintenance_schedules_create(
        superAdminConnection,
        {
          body: {
            maintenance_type: maintenanceType,
            title: RandomGenerator.paragraph({ sentences: 2 }),
            description: RandomGenerator.paragraph({ sentences: 3 }),
            planned_start_at: typia.random<string & tags.Format<"date-time">>(),
            planned_end_at: typia.random<string & tags.Format<"date-time">>(),
          } satisfies IDiscussionBoardMaintenanceSchedule.ICreate,
        },
      );
    // Validate complete response structure
    typia.assert(schedule);
    // Verify maintenance type is preserved
    TestValidator.equals(
      `maintenance_type should be ${maintenanceType}`,
      schedule.maintenance_type,
      maintenanceType,
    );
    // Verify business logic: planned_end_at is after planned_start_at
    TestValidator.predicate(
      "planned_end_at should be after planned_start_at",
      new Date(schedule.planned_end_at) > new Date(schedule.planned_start_at),
    );
  }
}
