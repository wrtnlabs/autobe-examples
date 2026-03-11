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

export async function test_api_maintenance_schedule_timing_validation(
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
  // 2. Test valid timing configuration using utility function
  const validSchedule =
    await generate_random_discussion_board_admin_maintenance_schedules_create(
      adminConnection,
      {
        body: {
          planned_start_at: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
          planned_end_at: new Date(Date.now() + 7200000).toISOString(), // 2 hours from now
        },
      },
    );
  typia.assert(validSchedule);
  // 3. Test invalid timing: planned_end_at before planned_start_at
  await TestValidator.error(
    "planned_end_at before planned_start_at should be rejected",
    async () => {
      await generate_random_discussion_board_admin_maintenance_schedules_create(
        adminConnection,
        {
          body: {
            planned_start_at: new Date(Date.now() + 7200000).toISOString(), // 2 hours from now
            planned_end_at: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now (invalid)
          },
        },
      );
    },
  );
  // 4. Test invalid timing: identical start and end times
  await TestValidator.error(
    "identical start and end times should be rejected",
    async () => {
      const identicalTime = new Date(Date.now() + 3600000).toISOString();
      await generate_random_discussion_board_admin_maintenance_schedules_create(
        adminConnection,
        {
          body: {
            planned_start_at: identicalTime,
            planned_end_at: identicalTime,
          },
        },
      );
    },
  );
  // 5. Test another valid timing configuration
  const validSchedule2 =
    await generate_random_discussion_board_admin_maintenance_schedules_create(
      adminConnection,
      {
        body: {
          planned_start_at: new Date(Date.now() + 86400000).toISOString(), // 1 day from now
          planned_end_at: new Date(Date.now() + 172800000).toISOString(), // 2 days from now
        },
      },
    );
  typia.assert(validSchedule2);
  // 6. Validate that valid schedules have correct timing
  TestValidator.predicate(
    "valid schedule should have planned_end_at after planned_start_at",
    new Date(validSchedule.planned_end_at) >
      new Date(validSchedule.planned_start_at),
  );
  TestValidator.predicate(
    "valid schedule2 should have planned_end_at after planned_start_at",
    new Date(validSchedule2.planned_end_at) >
      new Date(validSchedule2.planned_start_at),
  );
}
