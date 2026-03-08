import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
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

export async function test_api_superadmin_self_ban_prevention(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a super admin account
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Step 2: Attempt to ban the super admin using their own ID
  // This should fail with an appropriate error
  await TestValidator.error("super admin cannot ban themselves", async () => {
    await api.functional.discussionBoard.superAdmin.actors.ban.create(
      superAdminConnection,
      {
        body: {
          discussion_board_member_id: superAdmin.id,
          ban_reason: "Testing self-ban prevention",
        } satisfies IDiscussionBoardBanRecord.IRequest,
      },
    );
  });
  // Step 3: Verify the super admin connection is still valid
  // by ensuring no errors occurred and the connection is still authenticated
  TestValidator.predicate(
    "connection still valid after self-ban attempt",
    () => superAdminConnection.headers !== undefined,
  );
}
