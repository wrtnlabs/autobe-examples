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

/**
 * Test updating a moderate ban duration to a permanent ban configuration.
 * 1. Super administrator authenticates
 * 2. Create initial moderate ban duration (24-hour ban)
 * 3. Update ban duration to permanent ban configuration
 * 4. Validate update success and configuration changes
 */
export async function test_api_ban_duration_update_moderate_to_permanent(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 2. Create initial moderate ban duration
  const moderateBanDuration =
    await generate_random_discussion_board_super_admin_ban_durations_create(
      superAdminConnection,
      {
        body: {
          name: "24-Hour Ban",
          description: "Temporary 24-hour suspension for minor violations",
          duration_hours: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<24>
          >(),
          is_permanent: false,
        } satisfies IDiscussionBoardBanDuration.ICreate,
      },
    );
  typia.assert(moderateBanDuration);
  // 3. Update to permanent ban configuration
  const updatedBanDuration =
    await api.functional.discussionBoard.superAdmin.ban_durations.update(
      superAdminConnection,
      {
        durationId: moderateBanDuration.id,
        body: {
          name: "Permanent Ban",
          description: "Permanent account suspension for severe violations",
          duration_hours: 0,
          is_permanent: true,
        } satisfies IDiscussionBoardBanDuration.IUpdate,
      },
    );
  typia.assert(updatedBanDuration);
  // 4. Validate update success
  TestValidator.equals(
    "ID remains the same",
    updatedBanDuration.id,
    moderateBanDuration.id,
  );
  TestValidator.equals(
    "name updated to permanent",
    updatedBanDuration.name,
    "Permanent Ban",
  );
  TestValidator.equals(
    "description updated",
    updatedBanDuration.description,
    "Permanent account suspension for severe violations",
  );
  TestValidator.equals(
    "duration_hours set to 0",
    updatedBanDuration.duration_hours,
    0,
  );
  TestValidator.equals(
    "is_permanent set to true",
    updatedBanDuration.is_permanent,
    true,
  );
  TestValidator.notEquals(
    "updated_at timestamp changed",
    updatedBanDuration.updated_at,
    moderateBanDuration.updated_at,
  );
  TestValidator.equals(
    "created_at remains unchanged",
    updatedBanDuration.created_at,
    moderateBanDuration.created_at,
  );
}
