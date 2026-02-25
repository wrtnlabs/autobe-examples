import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardMaintenanceSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMaintenanceSchedule";
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

export async function test_api_maintenance_schedule_creation_database_backup_low_impact(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // Create maintenance schedule with database backup configuration
  const maintenanceSchedule =
    await api.functional.discussionBoard.admin.maintenance_schedules.create(
      adminConnection,
      {
        body: {
          maintenance_type: "database_backup",
          description:
            "Routine database backup procedure to ensure data integrity and disaster recovery capabilities",
          scheduled_start_time: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
          scheduled_end_time: new Date(
            Date.now() + 86400000 + 14400000,
          ).toISOString(), // Tomorrow + 4 hours
          estimated_duration_minutes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<240> & tags.Maximum<240>
          >(),
          impact_level: "low",
          status: "scheduled",
          notes: "Expected minimal disruption during off-peak hours",
        } satisfies IDiscussionBoardMaintenanceSchedule.ICreate,
      },
    );
  typia.assert(maintenanceSchedule);
  // Validate maintenance schedule properties
  TestValidator.equals(
    "maintenance type",
    maintenanceSchedule.maintenance_type,
    "database_backup",
  );
  TestValidator.equals("impact level", maintenanceSchedule.impact_level, "low");
  TestValidator.equals("status", maintenanceSchedule.status, "scheduled");
  TestValidator.equals(
    "estimated duration",
    maintenanceSchedule.estimated_duration_minutes,
    240,
  );
  TestValidator.predicate(
    "has description",
    maintenanceSchedule.description.length > 0,
  );
  TestValidator.predicate(
    "has scheduled admin",
    maintenanceSchedule.scheduled_by_admin.id.length > 0,
  );
  TestValidator.equals(
    "performed by admin is null",
    maintenanceSchedule.performed_by_admin,
    null,
  );
  TestValidator.equals(
    "actual start time is null",
    maintenanceSchedule.actual_start_time,
    null,
  );
  TestValidator.equals(
    "actual end time is null",
    maintenanceSchedule.actual_end_time,
    null,
  );
  TestValidator.equals(
    "actual duration is null",
    maintenanceSchedule.actual_duration_minutes,
    null,
  );
}
