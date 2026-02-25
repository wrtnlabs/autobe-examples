import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBanDuration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanDuration";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
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

export async function test_api_ban_duration_deletion_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create super administrator connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Step 2: Create a ban duration configuration to delete
  const duration =
    await generate_random_discussion_board_super_admin_ban_durations_create(
      superAdminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          duration_hours: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          is_permanent: false,
        } satisfies IDiscussionBoardBanDuration.ICreate,
      },
    );
  await typia.assert(duration);
  // Step 3: Delete the ban duration configuration
  await api.functional.discussionBoard.superAdmin.ban_durations.erase(
    superAdminConnection,
    {
      durationId: duration.id,
    },
  );
  // Step 4: Verify deletion by attempting to delete again (should fail with 404)
  await TestValidator.httpError(
    "deleting non-existent ban duration should return 404",
    404,
    async () => {
      await api.functional.discussionBoard.superAdmin.ban_durations.erase(
        superAdminConnection,
        {
          durationId: duration.id,
        },
      );
    },
  );
}
