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

export async function test_api_maintenance_schedule_view_details(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(authorized);
  // 2. Create a maintenance schedule
  const maintenanceSchedule =
    await generate_random_discussion_board_super_admin_maintenance_schedules_create(
      superAdminConnection,
      {
        body: {
          maintenance_type: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          scheduled_start_time: new Date(Date.now() + 86400000).toISOString(), // tomorrow
          scheduled_end_time: new Date(Date.now() + 172800000).toISOString(), // day after tomorrow
          estimated_duration_minutes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1440>
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
  // 3. Retrieve the maintenance schedule details
  const retrievedSchedule =
    await api.functional.discussionBoard.superAdmin.maintenance_schedules.at(
      superAdminConnection,
      {
        scheduleId: maintenanceSchedule.id,
      },
    );
  typia.assert(retrievedSchedule);
  // 4. Validate the retrieved schedule matches the created one
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
    "status matches",
    retrievedSchedule.status,
    maintenanceSchedule.status,
  );
  TestValidator.equals(
    "estimated duration minutes matches",
    retrievedSchedule.estimated_duration_minutes,
    maintenanceSchedule.estimated_duration_minutes,
  );
  TestValidator.equals(
    "impact level matches",
    retrievedSchedule.impact_level,
    maintenanceSchedule.impact_level,
  );
  TestValidator.equals(
    "notes matches",
    retrievedSchedule.notes,
    maintenanceSchedule.notes,
  );
  // 5. Validate administrator reference
  TestValidator.predicate(
    "scheduled_by_admin exists",
    retrievedSchedule.scheduled_by_admin !== null,
  );
  TestValidator.predicate(
    "scheduled_by_admin has id",
    retrievedSchedule.scheduled_by_admin.id !== undefined,
  );
  TestValidator.predicate(
    "scheduled_by_admin has email",
    retrievedSchedule.scheduled_by_admin.email !== undefined,
  );
  TestValidator.predicate(
    "scheduled_by_admin has display_name",
    retrievedSchedule.scheduled_by_admin.display_name !== undefined,
  );
  TestValidator.predicate(
    "scheduled_by_admin has created_at",
    retrievedSchedule.scheduled_by_admin.created_at !== undefined,
  );
  // 6. Validate timestamps are ISO 8601 format
  TestValidator.predicate(
    "created_at is ISO format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(
      retrievedSchedule.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at is ISO format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(
      retrievedSchedule.updated_at,
    ),
  );
  // 7. Validate deleted_at is null for active record
  TestValidator.equals(
    "deleted_at is null",
    retrievedSchedule.deleted_at,
    null,
  );
  // 8. Validate actual duration calculation when actual times are set
  if (
    retrievedSchedule.actual_start_time &&
    retrievedSchedule.actual_end_time
  ) {
    const startTime = new Date(retrievedSchedule.actual_start_time);
    const endTime = new Date(retrievedSchedule.actual_end_time);
    const calculatedDuration = Math.round(
      (endTime.getTime() - startTime.getTime()) / (1000 * 60),
    );
    TestValidator.equals(
      "actual duration matches calculation",
      retrievedSchedule.actual_duration_minutes,
      calculatedDuration,
    );
  }
}
