import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardMaintenanceSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMaintenanceSchedule";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
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

export async function test_api_maintenance_schedule_status_transition(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as superAdmin
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create a maintenance schedule with scheduled status
  const maintenanceSchedule =
    await generate_random_discussion_board_super_admin_maintenance_schedules_create(
      superAdminConnection,
      {
        body: {
          maintenance_type: "system_update",
          description: RandomGenerator.paragraph({ sentences: 3 }),
          scheduled_start_time: new Date(Date.now() + 3600000).toISOString(),
          scheduled_end_time: new Date(Date.now() + 7200000).toISOString(),
          estimated_duration_minutes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          impact_level: "medium",
          status: "scheduled",
          notes: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardMaintenanceSchedule.ICreate,
      },
    );
  typia.assert(maintenanceSchedule);
  // Verify initial status is scheduled
  TestValidator.equals(
    "initial status",
    maintenanceSchedule.status,
    "scheduled",
  );
  TestValidator.equals(
    "performed_by_admin initially null",
    maintenanceSchedule.performed_by_admin,
    null,
  );
  // Update schedule to in-progress status with actual_start_time
  const actualStartTime = new Date().toISOString();
  const updatedSchedule =
    await api.functional.discussionBoard.superAdmin.maintenance_schedules.update(
      superAdminConnection,
      {
        scheduleId: maintenanceSchedule.id,
        body: {
          status: "in-progress",
        } satisfies IDiscussionBoardMaintenanceSchedule.IUpdate,
      },
    );
  typia.assert(updatedSchedule);
  // Verify status transition and performed_by_admin assignment
  TestValidator.equals(
    "status transition",
    updatedSchedule.status,
    "in-progress",
  );
  TestValidator.predicate(
    "performed_by_admin assigned",
    updatedSchedule.performed_by_admin !== null,
  );
  TestValidator.predicate(
    "actual_start_time populated",
    updatedSchedule.actual_start_time !== null,
  );
  // Verify workflow progression prevents invalid transitions
  await TestValidator.error("cannot transition back to scheduled", async () => {
    await api.functional.discussionBoard.superAdmin.maintenance_schedules.update(
      superAdminConnection,
      {
        scheduleId: maintenanceSchedule.id,
        body: {
          status: "scheduled",
        } satisfies IDiscussionBoardMaintenanceSchedule.IUpdate,
      },
    );
  });
}
