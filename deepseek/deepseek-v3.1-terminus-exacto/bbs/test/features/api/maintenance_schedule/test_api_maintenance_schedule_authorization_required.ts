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
 * Test that proper super administrator authorization is required to access maintenance schedule details.
 * Attempt to retrieve a maintenance schedule without authentication and verify that the system returns
 * an appropriate authorization error (401 Unauthorized). Validate that only authenticated super administrators
 * can access this administrative endpoint, not regular administrators or regular users.
 */
export async function test_api_maintenance_schedule_authorization_required(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator account
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 2. Create a maintenance schedule as super admin
  const maintenanceSchedule =
    await generate_random_discussion_board_super_admin_maintenance_schedules_create(
      superAdminConnection,
      {
        body: {
          maintenance_type: "system_update",
          title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          planned_start_at: new Date(Date.now() + 86400000).toISOString(), // tomorrow
          planned_end_at: new Date(Date.now() + 172800000).toISOString(), // day after tomorrow
        } satisfies IDiscussionBoardMaintenanceSchedule.ICreate,
      },
    );
  typia.assert(maintenanceSchedule);
  // 3. Test unauthorized access - attempt to retrieve without authorization
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  // Clear any potential authorization headers
  unauthorizedConnection.headers = {};
  await TestValidator.error("unauthorized access should fail", async () => {
    await api.functional.discussionBoard.superAdmin.maintenance_schedules.at(
      unauthorizedConnection,
      {
        scheduleId: maintenanceSchedule.id,
      },
    );
  });
  // 4. Test authorized access - should succeed with proper super admin authorization
  const authorizedSchedule =
    await api.functional.discussionBoard.superAdmin.maintenance_schedules.at(
      superAdminConnection,
      {
        scheduleId: maintenanceSchedule.id,
      },
    );
  typia.assert(authorizedSchedule);
  // 5. Validate that retrieved schedule matches the created one
  TestValidator.equals(
    "schedule ID should match",
    authorizedSchedule.id,
    maintenanceSchedule.id,
  );
  TestValidator.equals(
    "maintenance type should match",
    authorizedSchedule.maintenance_type,
    maintenanceSchedule.maintenance_type,
  );
  TestValidator.equals(
    "title should match",
    authorizedSchedule.title,
    maintenanceSchedule.title,
  );
}
