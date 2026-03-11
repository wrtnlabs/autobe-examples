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

export async function test_api_maintenance_schedule_update_title_and_timing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create initial maintenance schedule
  const maintenanceTypes = [
    "backup",
    "system_update",
    "database_maintenance",
    "security_patch",
    "performance_optimization",
  ] as const;
  const initialType = RandomGenerator.pick(maintenanceTypes);
  const initialSchedule =
    await generate_random_discussion_board_admin_maintenance_schedules_create(
      adminConnection,
      {
        body: {
          maintenance_type: initialType,
          title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          planned_start_at: new Date(
            Date.now() + 24 * 60 * 60 * 1000,
          ).toISOString(), // tomorrow
          planned_end_at: new Date(
            Date.now() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000,
          ).toISOString(), // tomorrow + 1 hour
        } satisfies IDiscussionBoardMaintenanceSchedule.ICreate,
      },
    );
  typia.assert(initialSchedule);
  // 3. Update maintenance schedule with new details
  const updateData: IDiscussionBoardMaintenanceSchedule.IUpdate = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    planned_start_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // day after tomorrow
    planned_end_at: new Date(
      Date.now() + 48 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000,
    ).toISOString(), // day after tomorrow + 2 hours
  };
  const updatedSchedule =
    await api.functional.discussionBoard.admin.maintenance_schedules.update(
      adminConnection,
      {
        scheduleId: initialSchedule.id,
        body: updateData,
      },
    );
  typia.assert(updatedSchedule);
  // 4. Validate business logic (not type validation)
  TestValidator.equals(
    "id remains unchanged",
    updatedSchedule.id,
    initialSchedule.id,
  );
  TestValidator.equals(
    "maintenance_type remains unchanged",
    updatedSchedule.maintenance_type,
    initialSchedule.maintenance_type,
  );
  TestValidator.equals(
    "title updated",
    updatedSchedule.title,
    updateData.title,
  );
  TestValidator.equals(
    "description updated",
    updatedSchedule.description,
    updateData.description,
  );
  TestValidator.equals(
    "planned_start_at updated",
    updatedSchedule.planned_start_at,
    updateData.planned_start_at,
  );
  TestValidator.equals(
    "planned_end_at updated",
    updatedSchedule.planned_end_at,
    updateData.planned_end_at,
  );
  TestValidator.equals(
    "created_at remains unchanged",
    updatedSchedule.created_at,
    initialSchedule.created_at,
  );
  TestValidator.notEquals(
    "updated_at changed",
    updatedSchedule.updated_at,
    initialSchedule.updated_at,
  );
}
