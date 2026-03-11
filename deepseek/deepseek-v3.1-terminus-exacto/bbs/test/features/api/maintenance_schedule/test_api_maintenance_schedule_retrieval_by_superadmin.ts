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

export async function test_api_maintenance_schedule_retrieval_by_superadmin(
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
  // Create a maintenance schedule record
  const createdSchedule =
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
  typia.assert(createdSchedule);
  // Retrieve the maintenance schedule
  const retrievedSchedule =
    await api.functional.discussionBoard.superAdmin.maintenance_schedules.at(
      superAdminConnection,
      {
        scheduleId: createdSchedule.id,
      },
    );
  typia.assert(retrievedSchedule);
  // Validate the retrieved schedule matches the created one
  TestValidator.equals(
    "schedule ID matches",
    retrievedSchedule.id,
    createdSchedule.id,
  );
  TestValidator.equals(
    "maintenance type matches",
    retrievedSchedule.maintenance_type,
    createdSchedule.maintenance_type,
  );
  TestValidator.equals(
    "title matches",
    retrievedSchedule.title,
    createdSchedule.title,
  );
  TestValidator.equals(
    "description matches",
    retrievedSchedule.description,
    createdSchedule.description,
  );
  TestValidator.equals(
    "planned start time matches",
    retrievedSchedule.planned_start_at,
    createdSchedule.planned_start_at,
  );
  TestValidator.equals(
    "planned end time matches",
    retrievedSchedule.planned_end_at,
    createdSchedule.planned_end_at,
  );
  // Validate business logic - statusType should be properly resolved
  TestValidator.predicate(
    "statusType has valid structure",
    retrievedSchedule.statusType.id.length > 0 &&
      retrievedSchedule.statusType.category.length > 0 &&
      retrievedSchedule.statusType.code.length > 0 &&
      retrievedSchedule.statusType.display_name.length > 0,
  );
}
