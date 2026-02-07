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

export async function test_api_maintenance_schedule_deletion_completed_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
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
  // 2. Create a maintenance schedule that will be marked as completed
  const schedule =
    await generate_random_discussion_board_admin_maintenance_schedules_create(
      adminConnection,
      {
        body: {
          maintenance_type: "system update",
          description: RandomGenerator.paragraph({ sentences: 3 }),
          scheduled_start_time: new Date(Date.now() - 86400000).toISOString(), // yesterday (past)
          scheduled_end_time: new Date(Date.now() - 82800000).toISOString(), // yesterday + 1 hour (past)
          estimated_duration_minutes: 60,
          impact_level: "low",
          notes: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardMaintenanceSchedule.ICreate,
      },
    );
  typia.assert(schedule);
  // Note: Since the API doesn't provide an endpoint to update maintenance schedule status,
  // we'll proceed with deletion assuming the system allows deletion of completed schedules
  // based on the scenario description which states we should "attempt to delete it"
  // 3. Delete the maintenance schedule
  const deletedSchedule =
    await api.functional.discussionBoard.admin.maintenance_schedules.erase(
      adminConnection,
      {
        scheduleId: schedule.id,
      },
    );
  typia.assert(deletedSchedule);
  // 4. Validate soft deletion occurred
  TestValidator.notEquals(
    "deleted_at should be set after deletion",
    deletedSchedule.deleted_at,
    null,
  );
  TestValidator.predicate("deleted_at should be a valid timestamp", () => {
    return (
      deletedSchedule.deleted_at !== null &&
      new Date(deletedSchedule.deleted_at).getTime() > 0
    );
  });
  // 5. Validate that the schedule properties remain intact (soft deletion preserves data)
  TestValidator.equals(
    "id should remain unchanged",
    deletedSchedule.id,
    schedule.id,
  );
  TestValidator.equals(
    "maintenance_type should remain unchanged",
    deletedSchedule.maintenance_type,
    schedule.maintenance_type,
  );
  TestValidator.equals(
    "description should remain unchanged",
    deletedSchedule.description,
    schedule.description,
  );
  TestValidator.equals(
    "scheduled_start_time should remain unchanged",
    deletedSchedule.scheduled_start_time,
    schedule.scheduled_start_time,
  );
  TestValidator.equals(
    "scheduled_end_time should remain unchanged",
    deletedSchedule.scheduled_end_time,
    schedule.scheduled_end_time,
  );
}
