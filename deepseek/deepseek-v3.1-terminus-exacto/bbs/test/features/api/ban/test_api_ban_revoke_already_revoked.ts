import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_admin_bans_create } from "../../../generate/generate_random_discussion_board_admin_bans_create";
import { prepare_random_discussion_board_ban_record } from "../../../prepare/prepare_random_discussion_board_ban_record";

/**
 * Test ban revocation failure when ban is already revoked.
 * 1. Create admin user and authenticate
 * 2. Create regular user to be banned
 * 3. Create an active ban on the regular user
 * 4. Revoke the ban successfully (first revocation)
 * 5. Attempt to revoke the same ban again (should fail)
 */
export async function test_api_ban_revoke_already_revoked(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate admin user
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create regular user to be banned
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user);
  // 3. Create an active ban on the regular user
  const ban = await api.functional.discussionBoard.admin.bans.create(
    adminConnection,
    {
      body: {
        bannedUserId: user.id,
        banReason: RandomGenerator.paragraph({ sentences: 3 }),
        banDurationType: "permanent",
      } satisfies IDiscussionBoardBanRecord.ICreate,
    },
  );
  typia.assert(ban);
  // 4. First revocation (should succeed)
  const revokedBan = await api.functional.discussionBoard.admin.bans.revoke(
    adminConnection,
    {
      banId: ban.id,
      body: {
        revoked_reason: "Test revocation",
      } satisfies IDiscussionBoardBanRecord.IRevoke,
    },
  );
  typia.assert(revokedBan);
  // 5. Attempt second revocation (should fail)
  await TestValidator.error("duplicate ban revocation", async () => {
    await api.functional.discussionBoard.admin.bans.revoke(adminConnection, {
      banId: ban.id,
      body: {
        revoked_reason: "Second revocation attempt",
      } satisfies IDiscussionBoardBanRecord.IRevoke,
    });
  });
}
