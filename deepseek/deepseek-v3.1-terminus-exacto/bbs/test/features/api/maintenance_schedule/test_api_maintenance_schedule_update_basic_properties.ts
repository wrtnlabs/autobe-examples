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
 * Test updating basic maintenance schedule properties including description, timing adjustments, and impact level.
 * 1. Create an admin account and authenticate
 * 2. Create an initial maintenance schedule
 * 3. Update basic properties (description, timing, impact level, notes, status)
 * 4. Verify the schedule is updated correctly with preserved relationships
 */
export async function test_api_maintenance_schedule_update_basic_properties(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup and authentication
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
  // 2. Create initial maintenance schedule
  const initialSchedule =
    await generate_random_discussion_board_admin_maintenance_schedules_create(
      adminConnection,
      {
        body: {
          maintenance_type: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          scheduled_start_time: typia.random<
            string & tags.Format<"date-time">
          >(),
          scheduled_end_time: typia.random<string & tags.Format<"date-time">>(),
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
          notes: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardMaintenanceSchedule.ICreate,
      },
    );
  typia.assert(initialSchedule);
  // 3. Update basic properties
  const updateData: IDiscussionBoardMaintenanceSchedule.IUpdate = {
    description: RandomGenerator.paragraph({ sentences: 3 }),
    scheduled_start_time: typia.random<string & tags.Format<"date-time">>(),
    scheduled_end_time: typia.random<string & tags.Format<"date-time">>(),
    impact_level: RandomGenerator.pick([
      "low",
      "medium",
      "high",
      "critical",
    ] as const),
    status: "in-progress",
    notes: RandomGenerator.paragraph({ sentences: 2 }),
  };
  const updatedSchedule =
    await api.functional.discussionBoard.admin.maintenance_schedules.update(
      adminConnection,
      {
        scheduleId: initialSchedule.id,
        body: updateData,
      },
    );
  typia.assert(updatedSchedule);
  // 4. Verify updates
  TestValidator.equals(
    "ID remains the same",
    updatedSchedule.id,
    initialSchedule.id,
  );
  TestValidator.equals(
    "description updated",
    updatedSchedule.description,
    updateData.description,
  );
  TestValidator.equals(
    "scheduled_start_time updated",
    updatedSchedule.scheduled_start_time,
    updateData.scheduled_start_time,
  );
  TestValidator.equals(
    "scheduled_end_time updated",
    updatedSchedule.scheduled_end_time,
    updateData.scheduled_end_time,
  );
  TestValidator.equals(
    "impact_level updated",
    updatedSchedule.impact_level,
    updateData.impact_level,
  );
  TestValidator.equals(
    "status updated",
    updatedSchedule.status,
    updateData.status,
  );
  TestValidator.equals(
    "notes updated",
    updatedSchedule.notes,
    updateData.notes,
  );
  // 5. Verify preserved properties
  TestValidator.equals(
    "maintenance_type preserved",
    updatedSchedule.maintenance_type,
    initialSchedule.maintenance_type,
  );
  TestValidator.equals(
    "estimated_duration_minutes preserved",
    updatedSchedule.estimated_duration_minutes,
    initialSchedule.estimated_duration_minutes,
  );
  TestValidator.equals(
    "created_at preserved",
    updatedSchedule.created_at,
    initialSchedule.created_at,
  );
  TestValidator.predicate(
    "updated_at changed",
    updatedSchedule.updated_at !== initialSchedule.updated_at,
  );
  // 6. Verify relationships
  TestValidator.equals(
    "scheduled_by_admin preserved",
    updatedSchedule.scheduled_by_admin.id,
    initialSchedule.scheduled_by_admin.id,
  );
  TestValidator.equals(
    "performed_by_admin preserved",
    updatedSchedule.performed_by_admin,
    initialSchedule.performed_by_admin,
  );
  // 7. Verify nullable fields
  TestValidator.equals(
    "actual_start_time remains null",
    updatedSchedule.actual_start_time,
    initialSchedule.actual_start_time,
  );
  TestValidator.equals(
    "actual_end_time remains null",
    updatedSchedule.actual_end_time,
    initialSchedule.actual_end_time,
  );
  TestValidator.equals(
    "actual_duration_minutes remains null",
    updatedSchedule.actual_duration_minutes,
    initialSchedule.actual_duration_minutes,
  );
  TestValidator.equals(
    "deleted_at remains null",
    updatedSchedule.deleted_at,
    initialSchedule.deleted_at,
  );
}
