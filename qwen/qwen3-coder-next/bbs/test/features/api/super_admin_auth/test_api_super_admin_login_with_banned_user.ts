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

export async function test_api_super_admin_login_with_banned_user(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a super admin account using the join endpoint
  const adminConnection: api.IConnection = { host: connection.host };
  const superAdminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardSuperAdmin.IJoin;
  const superAdmin = await authorize_super_admin_join(adminConnection, {
    body: superAdminCredentials,
  });
  typia.assert(superAdmin);
  // 2. Create a ban record for this user using /discussionBoard/superAdmin/actors/ban endpoint
  const banRequest = {
    discussion_board_member_id: superAdmin.id,
    ban_reason: `Test ban for banned user login prevention`,
  } satisfies IDiscussionBoardBanRecord.IRequest;
  const banRecord =
    await api.functional.discussionBoard.superAdmin.actors.ban.create(
      adminConnection,
      {
        body: banRequest,
      },
    );
  typia.assert(banRecord);
  // 3. Attempt to login with the banned user's credentials
  const bannedConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "banned super admin should not be able to login",
    async () => {
      await authorize_super_admin_login(bannedConnection, {
        body: {
          email: superAdminCredentials.email,
          password: superAdminCredentials.password,
        } satisfies IDiscussionBoardSuperAdmin.ILogin,
      });
    },
  );
  // 4. Verify no session is created and no JWT tokens are generated
  // (This is implicitly verified by the error test above)
}
