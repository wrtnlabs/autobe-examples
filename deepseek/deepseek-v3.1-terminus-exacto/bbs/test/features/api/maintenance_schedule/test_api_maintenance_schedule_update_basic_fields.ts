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

export async function test_api_maintenance_schedule_update_basic_fields(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
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
  // Create initial maintenance schedule
  const initialSchedule =
    await generate_random_discussion_board_admin_maintenance_schedules_create(
      adminConnection,
      {
        body: {
          maintenance_type: "system update",
          description: RandomGenerator.paragraph({ sentences: 3 }),
          scheduled_start_time: new Date(Date.now() + 86400000).toISOString(),
          scheduled_end_time: new Date(Date.now() + 172800000).toISOString(),
          estimated_duration_minutes: 1440,
          impact_level: "low",
          notes: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardMaintenanceSchedule.ICreate,
      },
    );
  typia.assert(initialSchedule);
  // Update basic fields
  const updateData: IDiscussionBoardMaintenanceSchedule.IUpdate = {
    maintenance_type: "security patch",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    impact_level: "medium",
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
  // Validate updated fields
  TestValidator.equals(
    "maintenance_type updated",
    updatedSchedule.maintenance_type,
    "security patch",
  );
  TestValidator.equals(
    "description updated",
    updatedSchedule.description,
    updateData.description,
  );
  TestValidator.equals(
    "impact_level updated",
    updatedSchedule.impact_level,
    "medium",
  );
  // Validate unchanged fields preserved
  TestValidator.equals("id preserved", updatedSchedule.id, initialSchedule.id);
  TestValidator.equals(
    "created_at preserved",
    updatedSchedule.created_at,
    initialSchedule.created_at,
  );
  TestValidator.equals(
    "scheduled_start_time preserved",
    updatedSchedule.scheduled_start_time,
    initialSchedule.scheduled_start_time,
  );
  TestValidator.equals(
    "scheduled_end_time preserved",
    updatedSchedule.scheduled_end_time,
    initialSchedule.scheduled_end_time,
  );
  TestValidator.equals(
    "estimated_duration_minutes preserved",
    updatedSchedule.estimated_duration_minutes,
    initialSchedule.estimated_duration_minutes,
  );
  // Handle nullable notes field properly
  if (initialSchedule.notes === null) {
    TestValidator.equals(
      "notes preserved as null",
      updatedSchedule.notes,
      null,
    );
  } else {
    TestValidator.equals(
      "notes preserved",
      updatedSchedule.notes,
      initialSchedule.notes,
    );
  }
  // Validate administrator relationships preserved
  TestValidator.equals(
    "scheduled_by_admin preserved",
    updatedSchedule.scheduled_by_admin.id,
    initialSchedule.scheduled_by_admin.id,
  );
  // Handle nullable performed_by_admin field properly
  if (initialSchedule.performed_by_admin === null) {
    TestValidator.equals(
      "performed_by_admin preserved as null",
      updatedSchedule.performed_by_admin,
      null,
    );
  } else if (
    initialSchedule.performed_by_admin !== null &&
    updatedSchedule.performed_by_admin !== null
  ) {
    TestValidator.equals(
      "performed_by_admin preserved",
      updatedSchedule.performed_by_admin.id,
      initialSchedule.performed_by_admin.id,
    );
  }
  // Validate timestamp updates
  TestValidator.predicate(
    "updated_at is newer than created_at",
    new Date(updatedSchedule.updated_at) > new Date(updatedSchedule.created_at),
  );
  TestValidator.predicate(
    "updated_at changed after update",
    new Date(updatedSchedule.updated_at) > new Date(initialSchedule.updated_at),
  );
}
