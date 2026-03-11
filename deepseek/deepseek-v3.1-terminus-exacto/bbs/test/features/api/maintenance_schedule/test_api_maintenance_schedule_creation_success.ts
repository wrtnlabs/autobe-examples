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

/**
 * Test the successful creation of a maintenance schedule by an administrator.
 * Validates that all required fields are properly set including maintenance_type,
 * title, planned_start_at, and planned_end_at. Verifies that the system automatically
 * assigns an appropriate pending status from the centralized status enumeration system.
 * Checks that the response includes the complete maintenance schedule record with
 * generated UUID, timestamps, and status information.
 */
export async function test_api_maintenance_schedule_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Create maintenance schedule with valid data
  const maintenanceTypes = [
    "backup",
    "system_update",
    "database_maintenance",
    "security_patch",
    "performance_optimization",
  ] as const;
  const maintenanceType = RandomGenerator.pick(maintenanceTypes);
  const plannedStart = new Date(Date.now() + 86400000); // tomorrow
  const plannedEnd = new Date(plannedStart.getTime() + 86400000); // day after tomorrow
  const maintenanceSchedule =
    await generate_random_discussion_board_admin_maintenance_schedules_create(
      adminConnection,
      {
        body: {
          maintenance_type: maintenanceType,
          title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          planned_start_at: plannedStart.toISOString(),
          planned_end_at: plannedEnd.toISOString(),
        } satisfies IDiscussionBoardMaintenanceSchedule.ICreate,
      },
    );
  typia.assert(maintenanceSchedule);
  // 3. Validate business logic only (typia.assert already validated types and formats)
  TestValidator.equals(
    "maintenance type matches input",
    maintenanceSchedule.maintenance_type,
    maintenanceType,
  );
  TestValidator.predicate(
    "planned_end_at is after planned_start_at",
    new Date(maintenanceSchedule.planned_end_at) >
      new Date(maintenanceSchedule.planned_start_at),
  );
  TestValidator.predicate(
    "status type is assigned",
    maintenanceSchedule.statusType !== undefined,
  );
  TestValidator.predicate(
    "status type is active",
    maintenanceSchedule.statusType.is_active === true,
  );
}
