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
import { generate_random_discussion_board_admin_user_bans_create } from "../../../generate/generate_random_discussion_board_admin_user_bans_create";
import { prepare_random_discussion_board_ban_record } from "../../../prepare/prepare_random_discussion_board_ban_record";

/**
 * Test successful soft deletion of an active user ban by an administrator.
 */
export async function test_api_user_ban_admin_deletion_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate as admin
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
  // 2. Create a user with stored password
  const userPassword = RandomGenerator.alphaNumeric(16);
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: userPassword,
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user);
  // 3. Create a temporary ban record for the user
  const banDurationDays = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<365>
  >() satisfies number as number;
  const ban = await generate_random_discussion_board_admin_user_bans_create(
    adminConnection,
    {
      body: {
        bannedUserId: user.id,
        banReason: RandomGenerator.paragraph({ sentences: 3 }),
        banDurationType: "temporary" as const,
        banDurationDays,
      } satisfies IDiscussionBoardBanRecord.ICreate,
    },
  );
  typia.assert(ban);
  TestValidator.equals("ban targets correct user", ban.bannedUser.id, user.id);
  // 4. Delete the ban
  await api.functional.discussionBoard.admin.user_bans.erase(adminConnection, {
    banId: ban.id,
  });
  // 5. Verify user can log in after ban deletion (regains access)
  const freshUserConnection: api.IConnection = { host: connection.host };
  const reloggedUser = await authorize_user_login(freshUserConnection, {
    body: {
      email: user.email,
      password: userPassword,
    } satisfies IDiscussionBoardUser.ILogin,
  });
  typia.assert(reloggedUser);
  TestValidator.equals(
    "user can log in after ban deletion",
    reloggedUser.id,
    user.id,
  );
}
