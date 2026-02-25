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

export async function test_api_maintenance_schedule_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Create a maintenance schedule
  const maintenanceSchedule =
    await generate_random_discussion_board_admin_maintenance_schedules_create(
      adminConnection,
      {
        body: {
          maintenance_type: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          scheduled_start_time: new Date(Date.now() + 86400000).toISOString(), // tomorrow
          scheduled_end_time: new Date(
            Date.now() + 86400000 + 3600000,
          ).toISOString(), // tomorrow + 1 hour
          estimated_duration_minutes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          impact_level: RandomGenerator.pick([
            "low",
            "medium",
            "high",
            "critical",
          ] as const),
          status: "scheduled",
          notes: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardMaintenanceSchedule.ICreate,
      },
    );
  typia.assert(maintenanceSchedule);
  // Retrieve the maintenance schedule
  const retrievedSchedule =
    await api.functional.discussionBoard.admin.maintenance_schedules.at(
      adminConnection,
      {
        scheduleId: maintenanceSchedule.id,
      },
    );
  typia.assert(retrievedSchedule);
  // Validate business logic - the retrieved schedule matches the created one
  TestValidator.equals(
    "schedule ID matches",
    retrievedSchedule.id,
    maintenanceSchedule.id,
  );
  TestValidator.equals(
    "maintenance type matches",
    retrievedSchedule.maintenance_type,
    maintenanceSchedule.maintenance_type,
  );
  TestValidator.equals(
    "description matches",
    retrievedSchedule.description,
    maintenanceSchedule.description,
  );
  TestValidator.equals(
    "scheduled start time matches",
    retrievedSchedule.scheduled_start_time,
    maintenanceSchedule.scheduled_start_time,
  );
  TestValidator.equals(
    "scheduled end time matches",
    retrievedSchedule.scheduled_end_time,
    maintenanceSchedule.scheduled_end_time,
  );
  TestValidator.equals(
    "estimated duration matches",
    retrievedSchedule.estimated_duration_minutes,
    maintenanceSchedule.estimated_duration_minutes,
  );
  TestValidator.equals(
    "impact level matches",
    retrievedSchedule.impact_level,
    maintenanceSchedule.impact_level,
  );
  TestValidator.equals(
    "status matches",
    retrievedSchedule.status,
    maintenanceSchedule.status,
  );
  TestValidator.equals(
    "notes match",
    retrievedSchedule.notes,
    maintenanceSchedule.notes,
  );
  // Validate administrator assignments
  TestValidator.equals(
    "scheduled by admin ID matches",
    retrievedSchedule.scheduled_by_admin.id,
    adminAuth.id,
  );
  TestValidator.equals(
    "scheduled by admin email matches",
    retrievedSchedule.scheduled_by_admin.email,
    adminAuth.email,
  );
  TestValidator.equals(
    "scheduled by admin display name matches",
    retrievedSchedule.scheduled_by_admin.display_name,
    adminAuth.display_name,
  );
  // Validate that performed_by_admin is null since maintenance hasn't been performed yet
  TestValidator.equals(
    "performed_by_admin is null",
    retrievedSchedule.performed_by_admin,
    null,
  );
}
