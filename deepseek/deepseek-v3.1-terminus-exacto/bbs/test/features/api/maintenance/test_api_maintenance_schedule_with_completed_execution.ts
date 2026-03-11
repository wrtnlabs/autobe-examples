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

export async function test_api_maintenance_schedule_with_completed_execution(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Create a maintenance schedule
  const plannedStart = new Date(Date.now() - 1000 * 60 * 60 * 24); // 1 day ago
  const plannedEnd = new Date(Date.now() - 1000 * 60 * 60 * 12); // 12 hours ago
  const createdSchedule =
    await generate_random_discussion_board_admin_maintenance_schedules_create(
      adminConnection,
      {
        body: {
          maintenance_type: "system_update",
          title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          planned_start_at: plannedStart.toISOString(),
          planned_end_at: plannedEnd.toISOString(),
        } satisfies IDiscussionBoardMaintenanceSchedule.ICreate,
      },
    );
  typia.assert(createdSchedule);
  // 3. Retrieve the maintenance schedule
  const retrievedSchedule =
    await api.functional.discussionBoard.admin.maintenance_schedules.at(
      adminConnection,
      {
        scheduleId: createdSchedule.id,
      },
    );
  typia.assert(retrievedSchedule);
  // 4. Validate the retrieved schedule matches the created one
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
    "planned start matches",
    retrievedSchedule.planned_start_at,
    createdSchedule.planned_start_at,
  );
  TestValidator.equals(
    "planned end matches",
    retrievedSchedule.planned_end_at,
    createdSchedule.planned_end_at,
  );
  // 5. Validate that the schedule has execution metrics (actual timestamps)
  // Note: The API may automatically populate these based on status progression
  TestValidator.predicate(
    "has actual start timestamp",
    retrievedSchedule.actual_start_at !== null &&
      retrievedSchedule.actual_start_at !== undefined,
  );
  TestValidator.predicate(
    "has actual end timestamp",
    retrievedSchedule.actual_end_at !== null &&
      retrievedSchedule.actual_end_at !== undefined,
  );
  // 6. Validate statusType indicates completion
  TestValidator.predicate(
    "statusType has valid category",
    retrievedSchedule.statusType.category.length > 0,
  );
  TestValidator.predicate(
    "statusType has valid code",
    retrievedSchedule.statusType.code.length > 0,
  );
  TestValidator.predicate(
    "statusType has display name",
    retrievedSchedule.statusType.display_name.length > 0,
  );
  TestValidator.predicate(
    "statusType is active",
    retrievedSchedule.statusType.is_active === true,
  );
  // Validate that the status reflects a completed state (assuming completed status has specific characteristics)
  // This could be based on the status code or display name indicating completion
  TestValidator.predicate(
    "status indicates completion",
    retrievedSchedule.statusType.display_name
      .toLowerCase()
      .includes("complete") ||
      retrievedSchedule.statusType.code.toLowerCase().includes("complete") ||
      retrievedSchedule.statusType.display_name
        .toLowerCase()
        .includes("done") ||
      retrievedSchedule.statusType.code.toLowerCase().includes("done"),
  );
}
