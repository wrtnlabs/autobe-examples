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

export async function test_api_ban_duration_creation_temporary(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super administrator
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Prepare ban duration creation data
  const banDurationData = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    duration_hours: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<720>
    >(),
    is_permanent: false,
  } satisfies IDiscussionBoardBanDuration.ICreate;
  // Create temporary ban duration
  const banDuration =
    await api.functional.discussionBoard.superAdmin.ban_durations.create(
      superAdminConnection,
      {
        body: banDurationData,
      },
    );
  typia.assert(banDuration);
  // Validate business logic
  TestValidator.equals(
    "ban duration name matches input",
    banDuration.name,
    banDurationData.name,
  );
  TestValidator.equals(
    "ban duration description matches input",
    banDuration.description,
    banDurationData.description,
  );
  TestValidator.equals(
    "ban duration hours matches input",
    banDuration.duration_hours,
    banDurationData.duration_hours,
  );
  TestValidator.equals(
    "ban duration permanence flag matches input",
    banDuration.is_permanent,
    banDurationData.is_permanent,
  );
  TestValidator.predicate(
    "temporary ban has positive duration",
    banDuration.duration_hours > 0,
  );
}
