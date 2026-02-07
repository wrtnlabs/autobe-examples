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

export async function test_api_ban_duration_update_name_description_only(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create initial ban duration with specific values
  const initialBanDuration =
    await generate_random_discussion_board_super_admin_ban_durations_create(
      superAdminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          duration_hours: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<720>
          >(),
          is_permanent: false,
        } satisfies IDiscussionBoardBanDuration.ICreate,
      },
    );
  typia.assert(initialBanDuration);
  // Generate new name and description that are different from original
  let newName: string;
  let newDescription: string;
  do {
    newName = RandomGenerator.paragraph({ sentences: 2 });
  } while (newName === initialBanDuration.name);
  do {
    newDescription = RandomGenerator.paragraph({ sentences: 3 });
  } while (newDescription === initialBanDuration.description);
  // Update only name and description
  const updatedBanDuration =
    await api.functional.discussionBoard.superAdmin.ban_durations.update(
      superAdminConnection,
      {
        durationId: initialBanDuration.id,
        body: {
          name: newName,
          description: newDescription,
        } satisfies IDiscussionBoardBanDuration.IUpdate,
      },
    );
  typia.assert(updatedBanDuration);
  // Validate that duration settings remain unchanged
  TestValidator.equals(
    "duration_hours should remain unchanged after update",
    updatedBanDuration.duration_hours,
    initialBanDuration.duration_hours,
  );
  TestValidator.equals(
    "is_permanent flag should remain unchanged after update",
    updatedBanDuration.is_permanent,
    initialBanDuration.is_permanent,
  );
  // Validate that descriptive fields were updated
  TestValidator.notEquals(
    "name should be different after update",
    updatedBanDuration.name,
    initialBanDuration.name,
  );
  TestValidator.notEquals(
    "description should be different after update",
    updatedBanDuration.description,
    initialBanDuration.description,
  );
}
