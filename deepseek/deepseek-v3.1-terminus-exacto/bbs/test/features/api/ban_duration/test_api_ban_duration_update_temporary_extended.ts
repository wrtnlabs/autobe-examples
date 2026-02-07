import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardBanDuration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanDuration";
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
import { generate_random_discussion_board_super_admin_ban_durations_create } from "../../../generate/generate_random_discussion_board_super_admin_ban_durations_create";
import { prepare_random_discussion_board_ban_duration } from "../../../prepare/prepare_random_discussion_board_ban_duration";

export async function test_api_ban_duration_update_temporary_extended(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create initial temporary ban duration (1-hour ban as mentioned in scenario)
  const initialBanDuration =
    await generate_random_discussion_board_super_admin_ban_durations_create(
      superAdminConnection,
      {
        body: {
          name: "Short-term Ban",
          description: "Temporary 1-hour ban for minor violations",
          duration_hours: 1 satisfies number as number,
          is_permanent: false,
        } satisfies IDiscussionBoardBanDuration.ICreate,
      },
    );
  typia.assert(initialBanDuration);
  // Update ban duration with extended hours (72-hour ban as mentioned in scenario)
  const updatedBanDuration =
    await api.functional.discussionBoard.superAdmin.ban_durations.update(
      superAdminConnection,
      {
        durationId: initialBanDuration.id,
        body: {
          duration_hours: 72 satisfies number as number,
          description: "Extended 72-hour ban for repeated violations",
        } satisfies IDiscussionBoardBanDuration.IUpdate,
      },
    );
  typia.assert(updatedBanDuration);
  // Validate the update
  TestValidator.notEquals(
    "duration hours should be updated",
    initialBanDuration.duration_hours,
    updatedBanDuration.duration_hours,
  );
  TestValidator.equals(
    "ID should remain the same",
    initialBanDuration.id,
    updatedBanDuration.id,
  );
  TestValidator.equals(
    "name should remain unchanged",
    initialBanDuration.name,
    updatedBanDuration.name,
  );
  TestValidator.equals(
    "is_permanent flag should remain false",
    initialBanDuration.is_permanent,
    updatedBanDuration.is_permanent,
  );
  TestValidator.predicate(
    "updated duration should be longer than initial",
    updatedBanDuration.duration_hours > initialBanDuration.duration_hours,
  );
  TestValidator.equals(
    "description should be updated",
    updatedBanDuration.description,
    "Extended 72-hour ban for repeated violations",
  );
}
