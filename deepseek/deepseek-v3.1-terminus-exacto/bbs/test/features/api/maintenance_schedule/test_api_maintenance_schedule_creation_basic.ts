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

export async function test_api_maintenance_schedule_creation_basic(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Create maintenance schedule with valid timing
  const scheduledStartTime = new Date(Date.now() + 3600000).toISOString(); // 1 hour from now
  const scheduledEndTime = new Date(Date.now() + 7200000).toISOString(); // 2 hours from now
  const estimatedDurationMinutes = 60;
  const maintenanceSchedule =
    await api.functional.discussionBoard.superAdmin.maintenance_schedules.create(
      superAdminConnection,
      {
        body: {
          maintenance_type: "system_update",
          description: RandomGenerator.paragraph({ sentences: 3 }),
          scheduled_start_time: scheduledStartTime,
          scheduled_end_time: scheduledEndTime,
          estimated_duration_minutes: estimatedDurationMinutes,
          impact_level: "low",
          status: "scheduled",
          notes: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardMaintenanceSchedule.ICreate,
      },
    );
  typia.assert(maintenanceSchedule);
  // Validate all required fields are present
  TestValidator.predicate("has ID", maintenanceSchedule.id !== undefined);
  TestValidator.predicate(
    "has created_at",
    maintenanceSchedule.created_at !== undefined,
  );
  TestValidator.predicate(
    "has updated_at",
    maintenanceSchedule.updated_at !== undefined,
  );
  // Validate timing parameters
  TestValidator.equals(
    "maintenance_type matches",
    maintenanceSchedule.maintenance_type,
    "system_update",
  );
  TestValidator.equals(
    "scheduled_start_time matches",
    maintenanceSchedule.scheduled_start_time,
    scheduledStartTime,
  );
  TestValidator.equals(
    "scheduled_end_time matches",
    maintenanceSchedule.scheduled_end_time,
    scheduledEndTime,
  );
  TestValidator.equals(
    "estimated_duration_minutes matches",
    maintenanceSchedule.estimated_duration_minutes,
    estimatedDurationMinutes,
  );
  // Validate actual execution fields are null
  TestValidator.equals(
    "actual_start_time is null",
    maintenanceSchedule.actual_start_time,
    null,
  );
  TestValidator.equals(
    "actual_end_time is null",
    maintenanceSchedule.actual_end_time,
    null,
  );
  TestValidator.equals(
    "actual_duration_minutes is null",
    maintenanceSchedule.actual_duration_minutes,
    null,
  );
  TestValidator.equals(
    "performed_by_admin is null",
    maintenanceSchedule.performed_by_admin,
    null,
  );
  // Validate scheduled_by_admin is populated
  TestValidator.predicate(
    "scheduled_by_admin exists",
    maintenanceSchedule.scheduled_by_admin !== null,
  );
  TestValidator.predicate(
    "scheduled_by_admin has ID",
    maintenanceSchedule.scheduled_by_admin.id !== undefined,
  );
  TestValidator.predicate(
    "scheduled_by_admin has email",
    maintenanceSchedule.scheduled_by_admin.email !== undefined,
  );
}
