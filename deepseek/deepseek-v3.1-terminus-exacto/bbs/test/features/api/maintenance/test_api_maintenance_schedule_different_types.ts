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

export async function test_api_maintenance_schedule_different_types(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Define maintenance types based on schema documentation
  const maintenanceTypes = [
    "backup",
    "system_update",
    "database_maintenance",
    "security_patch",
    "performance_optimization",
  ];
  // Test each maintenance type with and without description
  for (const maintenanceType of maintenanceTypes) {
    // Test with description
    const scheduleWithDesc =
      await generate_random_discussion_board_admin_maintenance_schedules_create(
        adminConnection,
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
    typia.assert(scheduleWithDesc);
    TestValidator.equals(
      `maintenance type should be ${maintenanceType} with description`,
      scheduleWithDesc.maintenance_type,
      maintenanceType,
    );
    // Test without description
    const scheduleWithoutDesc =
      await generate_random_discussion_board_admin_maintenance_schedules_create(
        adminConnection,
        {
          body: {
            maintenance_type: maintenanceType,
            title: RandomGenerator.paragraph({ sentences: 2 }),
            description: undefined,
            planned_start_at: typia.random<string & tags.Format<"date-time">>(),
            planned_end_at: typia.random<string & tags.Format<"date-time">>(),
          } satisfies IDiscussionBoardMaintenanceSchedule.ICreate,
        },
      );
    typia.assert(scheduleWithoutDesc);
    TestValidator.equals(
      `maintenance type should be ${maintenanceType} without description`,
      scheduleWithoutDesc.maintenance_type,
      maintenanceType,
    );
  }
}
