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

export async function test_api_user_login_banned_user(
  connection: api.IConnection,
): Promise<void> {
  // Create user account
  const userConnection: api.IConnection = { host: connection.host };
  const userCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardUser.IJoin;
  const user = await authorize_user_join(userConnection, {
    body: userCredentials,
  });
  typia.assert(user);
  // Create administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IDiscussionBoardAdmin.IJoin;
  const admin = await authorize_admin_join(adminConnection, {
    body: adminCredentials,
  });
  typia.assert(admin);
  // Ban the user
  const banRecord = await generate_random_discussion_board_admin_bans_create(
    adminConnection,
    {
      body: {
        bannedUserId: user.id,
        banReason: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 10,
          wordMax: 15,
        }),
        banDurationType: "permanent" as const,
      } satisfies IDiscussionBoardBanRecord.ICreate,
    },
  );
  typia.assert(banRecord);
  // Attempt to log in as banned user
  await TestValidator.error("banned user login should fail", async () => {
    await api.functional.discussionBoard.auth.user.login(userConnection, {
      body: {
        email: userCredentials.email,
        password: userCredentials.password,
      } satisfies IDiscussionBoardUser.ILogin,
    });
  });
  // Verify ban record details
  TestValidator.equals("banned user matches", banRecord.bannedUser.id, user.id);
  TestValidator.equals(
    "banning admin matches",
    banRecord.banningAdministrator.id,
    admin.id,
  );
  TestValidator.equals("ban status is active", banRecord.banStatus, "active");
  TestValidator.predicate(
    "ban reason meets minimum length",
    banRecord.banReason.length >= 10,
  );
}
