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

export async function test_api_maintenance_schedule_delete_by_superadmin(
  connection: api.IConnection,
): Promise<void> {
  // Create superAdmin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(authResult);
  // Create maintenance schedule
  const schedule =
    await generate_random_discussion_board_super_admin_maintenance_schedules_create(
      superAdminConnection,
      {
        body: {
          maintenance_type: "system_update",
          title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          planned_start_at: new Date(Date.now() + 86400000).toISOString(),
          planned_end_at: new Date(Date.now() + 172800000).toISOString(),
        } satisfies IDiscussionBoardMaintenanceSchedule.ICreate,
      },
    );
  typia.assert(schedule);
  // Verify schedule is created with null deleted_at
  TestValidator.equals(
    "deleted_at should be null initially",
    schedule.deleted_at,
    null,
  );
  // Delete the maintenance schedule (soft deletion)
  await api.functional.discussionBoard.superAdmin.maintenance_schedules.erase(
    superAdminConnection,
    {
      scheduleId: schedule.id,
    },
  );
  // Since erase returns void and we cannot retrieve the deleted schedule,
  // we can only validate that the operation completes without error
  // The soft deletion behavior would need to be verified through other means
  // such as query endpoints that filter out deleted records
}
