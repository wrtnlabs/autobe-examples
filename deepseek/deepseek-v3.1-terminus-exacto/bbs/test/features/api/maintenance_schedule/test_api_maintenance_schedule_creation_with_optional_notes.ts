import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardMaintenanceSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMaintenanceSchedule";
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
 * Test creating a maintenance schedule with optional notes field populated.
 * Verify that the system accepts valid notes text and stores it correctly.
 * Ensure that notes field is properly handled when provided and doesn't interfere
 * with required field validation.
 */
export async function test_api_maintenance_schedule_creation_with_optional_notes(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super administrator
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Prepare maintenance schedule data with populated notes
  const notesText = RandomGenerator.paragraph({ sentences: 2 });
  const maintenanceSchedule =
    await generate_random_discussion_board_super_admin_maintenance_schedules_create(
      superAdminConnection,
      {
        body: {
          maintenance_type: "system_update",
          description: RandomGenerator.paragraph({ sentences: 3 }),
          scheduled_start_time: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
          scheduled_end_time: new Date(Date.now() + 90000000).toISOString(), // Tomorrow + 1 hour
          estimated_duration_minutes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          impact_level: "medium",
          notes: notesText,
        } satisfies IDiscussionBoardMaintenanceSchedule.ICreate,
      },
    );
  typia.assert(maintenanceSchedule);
  // Validate that notes field is properly stored and matches input
  TestValidator.equals(
    "notes field should match input",
    maintenanceSchedule.notes,
    notesText,
  );
  // Validate required fields are correctly stored
  TestValidator.equals(
    "maintenance type should match",
    maintenanceSchedule.maintenance_type,
    "system_update",
  );
  TestValidator.equals(
    "impact level should match",
    maintenanceSchedule.impact_level,
    "medium",
  );
  TestValidator.predicate(
    "status should be scheduled",
    maintenanceSchedule.status === "scheduled",
  );
  TestValidator.predicate(
    "should have scheduled by admin",
    maintenanceSchedule.scheduled_by_admin !== null,
  );
  TestValidator.predicate(
    "should have valid UUID",
    /^[0-9a-f-]{36}$/i.test(maintenanceSchedule.id),
  );
  TestValidator.predicate(
    "should have creation timestamp",
    maintenanceSchedule.created_at !== undefined,
  );
}
