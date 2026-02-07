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

/**
 * Test the successful soft deletion of a maintenance schedule by an administrator.
 * 1. Administrator authentication
 * 2. Maintenance schedule creation
 * 3. Schedule deletion
 * 4. Validation of soft deletion
 */
export async function test_api_maintenance_schedule_deletion_successful(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup and authentication
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
  // 2. Create a maintenance schedule
  const schedule =
    await generate_random_discussion_board_admin_maintenance_schedules_create(
      adminConnection,
      {
        body: {
          maintenance_type: "system update",
          description: RandomGenerator.paragraph({ sentences: 3 }),
          scheduled_start_time: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
          scheduled_end_time: new Date(Date.now() + 172800000).toISOString(), // Day after tomorrow
          estimated_duration_minutes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          impact_level: "low",
          notes: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardMaintenanceSchedule.ICreate,
      },
    );
  typia.assert(schedule);
  // 3. Delete the maintenance schedule
  const deletedSchedule =
    await api.functional.discussionBoard.admin.maintenance_schedules.erase(
      adminConnection,
      {
        scheduleId: schedule.id,
      },
    );
  typia.assert(deletedSchedule);
  // 4. Validate soft deletion
  TestValidator.equals(
    "schedule ID remains unchanged",
    deletedSchedule.id,
    schedule.id,
  );
  TestValidator.equals(
    "maintenance type remains unchanged",
    deletedSchedule.maintenance_type,
    schedule.maintenance_type,
  );
  TestValidator.equals(
    "description remains unchanged",
    deletedSchedule.description,
    schedule.description,
  );
  TestValidator.equals(
    "scheduled start time remains unchanged",
    deletedSchedule.scheduled_start_time,
    schedule.scheduled_start_time,
  );
  TestValidator.equals(
    "scheduled end time remains unchanged",
    deletedSchedule.scheduled_end_time,
    schedule.scheduled_end_time,
  );
  TestValidator.equals(
    "status remains unchanged",
    deletedSchedule.status,
    schedule.status,
  );
  TestValidator.equals(
    "impact level remains unchanged",
    deletedSchedule.impact_level,
    schedule.impact_level,
  );
  TestValidator.equals(
    "estimated duration remains unchanged",
    deletedSchedule.estimated_duration_minutes,
    schedule.estimated_duration_minutes,
  );
  TestValidator.equals(
    "notes remain unchanged",
    deletedSchedule.notes,
    schedule.notes,
  );
  TestValidator.predicate(
    "deleted_at timestamp is set",
    deletedSchedule.deleted_at !== null,
  );
  TestValidator.predicate(
    "deleted_at is valid ISO date",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(
      deletedSchedule.deleted_at!,
    ),
  );
}
