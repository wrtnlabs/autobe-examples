import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
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
import { generate_random_discussion_board_administrator_user_bans_create } from "../../../generate/generate_random_discussion_board_administrator_user_bans_create";
import { prepare_random_discussion_board_user_ban } from "../../../prepare/prepare_random_discussion_board_user_ban";

export async function test_api_administrator_user_ban_create_already_banned_user(
  connection: api.IConnection,
): Promise<void> {
  // Test banning fails if the administrator attempts to ban a user who is already banned.
  // This scenario requires administrator join before attempt to ban.
  // Validate that the API rejects the request with appropriate error indicating user is already banned.
  // Ensure no duplicate ban records are created and the data integrity is maintained.
  // 1. Administrator join and authorize
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // 2. Ban a user successfully for the first time
  const existingBan =
    await generate_random_discussion_board_administrator_user_bans_create(
      adminConnection,
      {
        body: {},
      },
    );
  typia.assert(existingBan);
  // 3. Attempt to ban the same user again
  await TestValidator.error(
    "banning an already banned user should fail",
    async () => {
      await generate_random_discussion_board_administrator_user_bans_create(
        adminConnection,
        {
          body: existingBan as DeepPartial<IDiscussionBoardUserBan>,
        },
      );
    },
  );
}
