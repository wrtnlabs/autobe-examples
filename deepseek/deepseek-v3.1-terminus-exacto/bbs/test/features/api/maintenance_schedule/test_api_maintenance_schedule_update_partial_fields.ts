import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardMaintenanceSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMaintenanceSchedule";
import type { IDiscussionBoardStatusType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusType";
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

export async function test_api_maintenance_schedule_update_partial_fields(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Create initial maintenance schedule
  const initialSchedule =
    await generate_random_discussion_board_admin_maintenance_schedules_create(
      adminConnection,
      {
        body: {
          maintenance_type: "backup",
          title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          planned_start_at: new Date(Date.now() + 86400000).toISOString(), // tomorrow
          planned_end_at: new Date(Date.now() + 172800000).toISOString(), // day after tomorrow
        } satisfies IDiscussionBoardMaintenanceSchedule.ICreate,
      },
    );
  typia.assert(initialSchedule);
  // Test 1: Update only title field
  const updatedTitle = RandomGenerator.paragraph({ sentences: 2 });
  const scheduleAfterTitleUpdate =
    await api.functional.discussionBoard.admin.maintenance_schedules.update(
      adminConnection,
      {
        scheduleId: initialSchedule.id,
        body: {
          title: updatedTitle,
        } satisfies IDiscussionBoardMaintenanceSchedule.IUpdate,
      },
    );
  typia.assert(scheduleAfterTitleUpdate);
  // Verify title changed, other fields unchanged
  TestValidator.equals(
    "title should be updated",
    scheduleAfterTitleUpdate.title,
    updatedTitle,
  );
  TestValidator.equals(
    "maintenance_type should remain unchanged",
    scheduleAfterTitleUpdate.maintenance_type,
    initialSchedule.maintenance_type,
  );
  TestValidator.equals(
    "description should remain unchanged",
    scheduleAfterTitleUpdate.description,
    initialSchedule.description,
  );
  TestValidator.equals(
    "planned_start_at should remain unchanged",
    scheduleAfterTitleUpdate.planned_start_at,
    initialSchedule.planned_start_at,
  );
  TestValidator.equals(
    "planned_end_at should remain unchanged",
    scheduleAfterTitleUpdate.planned_end_at,
    initialSchedule.planned_end_at,
  );
  // Test 2: Update only description field with null value
  const scheduleAfterDescriptionUpdate =
    await api.functional.discussionBoard.admin.maintenance_schedules.update(
      adminConnection,
      {
        scheduleId: initialSchedule.id,
        body: {
          description: null,
        } satisfies IDiscussionBoardMaintenanceSchedule.IUpdate,
      },
    );
  typia.assert(scheduleAfterDescriptionUpdate);
  // Verify description set to null, other fields unchanged
  TestValidator.equals(
    "description should be null",
    scheduleAfterDescriptionUpdate.description,
    null,
  );
  TestValidator.equals(
    "title should remain unchanged",
    scheduleAfterDescriptionUpdate.title,
    updatedTitle,
  );
  TestValidator.equals(
    "maintenance_type should remain unchanged",
    scheduleAfterDescriptionUpdate.maintenance_type,
    initialSchedule.maintenance_type,
  );
  // Test 3: Update multiple fields including actual timestamps
  const actualStartAt = new Date().toISOString();
  const actualEndAt = new Date(Date.now() + 3600000).toISOString(); // 1 hour later
  const scheduleAfterMultipleUpdate =
    await api.functional.discussionBoard.admin.maintenance_schedules.update(
      adminConnection,
      {
        scheduleId: initialSchedule.id,
        body: {
          maintenance_type: "system_update",
          actual_start_at: actualStartAt,
          actual_end_at: actualEndAt,
        } satisfies IDiscussionBoardMaintenanceSchedule.IUpdate,
      },
    );
  typia.assert(scheduleAfterMultipleUpdate);
  // Verify multiple fields updated, unspecified fields unchanged
  TestValidator.equals(
    "maintenance_type should be updated",
    scheduleAfterMultipleUpdate.maintenance_type,
    "system_update",
  );
  TestValidator.equals(
    "actual_start_at should be updated",
    scheduleAfterMultipleUpdate.actual_start_at,
    actualStartAt,
  );
  TestValidator.equals(
    "actual_end_at should be updated",
    scheduleAfterMultipleUpdate.actual_end_at,
    actualEndAt,
  );
  TestValidator.equals(
    "title should remain unchanged",
    scheduleAfterMultipleUpdate.title,
    updatedTitle,
  );
  TestValidator.equals(
    "description should remain null",
    scheduleAfterMultipleUpdate.description,
    null,
  );
  // Test 4: Update with empty payload (no fields specified)
  const scheduleAfterEmptyUpdate =
    await api.functional.discussionBoard.admin.maintenance_schedules.update(
      adminConnection,
      {
        scheduleId: initialSchedule.id,
        body: {} satisfies IDiscussionBoardMaintenanceSchedule.IUpdate,
      },
    );
  typia.assert(scheduleAfterEmptyUpdate);
  // Verify no fields changed
  TestValidator.equals(
    "all fields should remain unchanged after empty update",
    scheduleAfterEmptyUpdate,
    scheduleAfterMultipleUpdate,
  );
}
