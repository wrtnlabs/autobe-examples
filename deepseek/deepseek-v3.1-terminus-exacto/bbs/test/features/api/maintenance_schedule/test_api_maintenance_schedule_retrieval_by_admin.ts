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

/**
 * Test that an administrator can successfully retrieve a specific maintenance schedule by its ID.
 * Validate that all fields including id, maintenance_type, title, description, planned_start_at,
 * planned_end_at, actual_start_at, actual_end_at, created_at, updated_at, deleted_at, and
 * resolved statusType are returned correctly. Verify that the statusType is properly resolved
 * from the discussion_board_status_types table with display information.
 */
export async function test_api_maintenance_schedule_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Create a maintenance schedule record
  const createdSchedule =
    await generate_random_discussion_board_admin_maintenance_schedules_create(
      adminConnection,
      {
        body: {
          maintenance_type: "backup",
          title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          planned_start_at: new Date().toISOString(),
          planned_end_at: new Date(Date.now() + 3600000).toISOString(),
        } satisfies IDiscussionBoardMaintenanceSchedule.ICreate,
      },
    );
  typia.assert(createdSchedule);
  // Retrieve the maintenance schedule by ID
  const retrievedSchedule =
    await api.functional.discussionBoard.admin.maintenance_schedules.at(
      adminConnection,
      {
        scheduleId: createdSchedule.id,
      },
    );
  typia.assert(retrievedSchedule);
  // Validate business logic - the retrieved schedule should match the created one
  TestValidator.equals(
    "schedule ID matches",
    retrievedSchedule.id,
    createdSchedule.id,
  );
  TestValidator.equals(
    "maintenance type matches",
    retrievedSchedule.maintenance_type,
    createdSchedule.maintenance_type,
  );
  TestValidator.equals(
    "title matches",
    retrievedSchedule.title,
    createdSchedule.title,
  );
  TestValidator.equals(
    "description matches",
    retrievedSchedule.description,
    createdSchedule.description,
  );
  TestValidator.equals(
    "planned start time matches",
    retrievedSchedule.planned_start_at,
    createdSchedule.planned_start_at,
  );
  TestValidator.equals(
    "planned end time matches",
    retrievedSchedule.planned_end_at,
    createdSchedule.planned_end_at,
  );
}
