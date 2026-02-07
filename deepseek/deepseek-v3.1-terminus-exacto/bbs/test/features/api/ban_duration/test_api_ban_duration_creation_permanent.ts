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

export async function test_api_ban_duration_creation_permanent(
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
  // Create permanent ban duration
  const permanentBanDuration =
    await generate_random_discussion_board_super_admin_ban_durations_create(
      superAdminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          duration_hours: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<0>
          >(),
          is_permanent: true,
        } satisfies IDiscussionBoardBanDuration.ICreate,
      },
    );
  typia.assert(permanentBanDuration);
  // Validate permanent ban properties
  TestValidator.equals(
    "duration hours should be 0 for permanent ban",
    permanentBanDuration.duration_hours,
    0,
  );
  TestValidator.predicate(
    "permanent flag should be true",
    permanentBanDuration.is_permanent,
  );
  // Test ban duration name uniqueness constraint by attempting to create duplicate with same permanence
  await TestValidator.error(
    "should reject duplicate ban duration name",
    async () => {
      await generate_random_discussion_board_super_admin_ban_durations_create(
        superAdminConnection,
        {
          body: {
            name: permanentBanDuration.name,
            description: RandomGenerator.content({ paragraphs: 1 }),
            duration_hours: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<0>
            >(),
            is_permanent: true,
          } satisfies IDiscussionBoardBanDuration.ICreate,
        },
      );
    },
  );
}
