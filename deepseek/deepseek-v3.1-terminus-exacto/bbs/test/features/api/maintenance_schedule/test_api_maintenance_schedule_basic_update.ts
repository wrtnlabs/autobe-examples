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

export async function test_api_maintenance_schedule_basic_update(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as superAdmin
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
  // Create a maintenance schedule in scheduled status
  const createBody = {
    maintenance_type: "system_update",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    scheduled_start_time: new Date(Date.now() + 86400000).toISOString(), // tomorrow
    scheduled_end_time: new Date(Date.now() + 90000000).toISOString(), // tomorrow + 1 hour
    estimated_duration_minutes: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1>
    >(),
    impact_level: "low",
    status: "scheduled",
    notes: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IDiscussionBoardMaintenanceSchedule.ICreate;
  const createdSchedule =
    await api.functional.discussionBoard.superAdmin.maintenance_schedules.create(
      superAdminConnection,
      { body: createBody },
    );
  typia.assert(createdSchedule);
  // Store original timestamps for audit trail verification
  const originalCreatedAt = createdSchedule.created_at;
  const originalUpdatedAt = createdSchedule.updated_at;
  // Update the maintenance schedule with new descriptive information
  const updateBody = {
    description: RandomGenerator.paragraph({ sentences: 4 }),
    impact_level: "medium",
    notes: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IDiscussionBoardMaintenanceSchedule.IUpdate;
  const updatedSchedule =
    await api.functional.discussionBoard.superAdmin.maintenance_schedules.update(
      superAdminConnection,
      {
        scheduleId: createdSchedule.id,
        body: updateBody,
      },
    );
  typia.assert(updatedSchedule);
  // Verify the update succeeded and reflects all modified fields
  TestValidator.equals(
    "description updated",
    updatedSchedule.description,
    updateBody.description,
  );
  TestValidator.equals(
    "impact level updated",
    updatedSchedule.impact_level,
    updateBody.impact_level,
  );
  TestValidator.equals(
    "notes updated",
    updatedSchedule.notes,
    updateBody.notes,
  );
  // Verify unchanged timing information is preserved
  TestValidator.equals(
    "maintenance type unchanged",
    updatedSchedule.maintenance_type,
    createdSchedule.maintenance_type,
  );
  TestValidator.equals(
    "scheduled start time unchanged",
    updatedSchedule.scheduled_start_time,
    createdSchedule.scheduled_start_time,
  );
  TestValidator.equals(
    "scheduled end time unchanged",
    updatedSchedule.scheduled_end_time,
    createdSchedule.scheduled_end_time,
  );
  TestValidator.equals(
    "estimated duration unchanged",
    updatedSchedule.estimated_duration_minutes,
    createdSchedule.estimated_duration_minutes,
  );
  TestValidator.equals(
    "status unchanged",
    updatedSchedule.status,
    createdSchedule.status,
  );
  // Confirm audit trail is maintained
  TestValidator.equals(
    "created_at timestamp unchanged",
    updatedSchedule.created_at,
    originalCreatedAt,
  );
  TestValidator.notEquals(
    "updated_at timestamp changed",
    updatedSchedule.updated_at,
    originalUpdatedAt,
  );
}
