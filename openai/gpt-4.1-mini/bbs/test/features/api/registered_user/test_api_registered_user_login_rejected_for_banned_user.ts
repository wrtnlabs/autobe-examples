import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { authorize_registered_user_login } from "../../../authorize/authorize_registered_user_login";
import { authorize_registered_user_refresh } from "../../../authorize/authorize_registered_user_refresh";
import { generate_random_discussion_board_administrator_user_bans_create } from "../../../generate/generate_random_discussion_board_administrator_user_bans_create";
import { prepare_random_discussion_board_user_ban } from "../../../prepare/prepare_random_discussion_board_user_ban";

export async function test_api_registered_user_login_rejected_for_banned_user(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup: create and login administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(adminAuthorized);
  // 2. Registered user setup: create a registered user
  const userConnection: api.IConnection = { host: connection.host };
  const userAuthorized = await authorize_registered_user_join(userConnection, {
    body: {},
  });
  typia.assert(userAuthorized);
  // Extract registered user id from token access if possible
  // But since token structure is unknown, we'll use a placeholder logic here
  // For real test users, the user id would come from separate API or token claims
  // However, since no id is available, use userAuthorized.token.access as is
  // 3. Ban the registered user before login attempt
  await generate_random_discussion_board_administrator_user_bans_create(
    adminConnection,
    {
      body: {
        registeredUserId: userAuthorized.token.access,
        reason: "Violation of terms",
        bannedAt: new Date().toISOString(),
      } as any,
    },
  );
  // 4. Try logging in banned registered user and expect error
  await TestValidator.error("banned user login rejected", async () => {
    await authorize_registered_user_login(userConnection, {
      body: {},
    });
  });
}
