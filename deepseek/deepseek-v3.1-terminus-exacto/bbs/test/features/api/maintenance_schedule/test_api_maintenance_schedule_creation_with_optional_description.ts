import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMaintenanceSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMaintenanceSchedule";
import type { IDiscussionBoardStatusType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusType";
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

export async function test_api_maintenance_schedule_creation_with_optional_description(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Test case 1: Create maintenance schedule with detailed description
  const createWithDescription =
    await generate_random_discussion_board_super_admin_maintenance_schedules_create(
      superAdminConnection,
      {
        body: {
          maintenance_type: "system_update",
          title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          planned_start_at: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
          planned_end_at: new Date(Date.now() + 172800000).toISOString(), // Day after tomorrow
        },
      },
    );
  typia.assert(createWithDescription);
  // Test case 2: Create maintenance schedule with null description
  const createWithNullDescription =
    await generate_random_discussion_board_super_admin_maintenance_schedules_create(
      superAdminConnection,
      {
        body: {
          maintenance_type: "backup",
          title: RandomGenerator.paragraph({ sentences: 2 }),
          description: null,
          planned_start_at: new Date(Date.now() + 259200000).toISOString(), // 3 days from now
          planned_end_at: new Date(Date.now() + 345600000).toISOString(), // 4 days from now
        },
      },
    );
  typia.assert(createWithNullDescription);
  // Test case 3: Create maintenance schedule without description field (undefined)
  const createWithoutDescription =
    await generate_random_discussion_board_super_admin_maintenance_schedules_create(
      superAdminConnection,
      {
        body: {
          maintenance_type: "database_maintenance",
          title: RandomGenerator.paragraph({ sentences: 2 }),
          planned_start_at: new Date(Date.now() + 432000000).toISOString(), // 5 days from now
          planned_end_at: new Date(Date.now() + 518400000).toISOString(), // 6 days from now
        },
      },
    );
  typia.assert(createWithoutDescription);
  // Validate that all three schedules have unique IDs
  TestValidator.notEquals(
    "schedules should have different IDs",
    createWithDescription.id,
    createWithNullDescription.id,
  );
  TestValidator.notEquals(
    "schedules should have different IDs",
    createWithDescription.id,
    createWithoutDescription.id,
  );
  TestValidator.notEquals(
    "schedules should have different IDs",
    createWithNullDescription.id,
    createWithoutDescription.id,
  );
}
