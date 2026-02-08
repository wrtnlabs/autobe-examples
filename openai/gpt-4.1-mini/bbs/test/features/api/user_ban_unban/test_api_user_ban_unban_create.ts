import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserBan";
import type { IDiscussionBoardUserUnban } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserUnban";
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
import { generate_random_discussion_board_administrator_user_bans_unban_create_unban } from "../../../generate/generate_random_discussion_board_administrator_user_bans_unban_create_unban";
import { prepare_random_discussion_board_user_ban } from "../../../prepare/prepare_random_discussion_board_user_ban";
import { prepare_random_discussion_board_user_unban } from "../../../prepare/prepare_random_discussion_board_user_unban";

export async function test_api_user_ban_unban_create(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful unban creation by an authorized administrator.
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, { body: {} });
  // Create a ban record for a registered user
  const ban =
    await generate_random_discussion_board_administrator_user_bans_create(
      adminConnection,
      { body: {} },
    );
  typia.assert(ban);
  // Create an unban record linked to a banId - use a random UUID since 'id' is unknown
  const banId = (ban as any).id ?? typia.random<string & tags.Format<"uuid">>();
  const unban =
    await generate_random_discussion_board_administrator_user_bans_unban_create_unban(
      adminConnection,
      {
        params: { banId },
        body: {},
      },
    );
  typia.assert(unban);
  // Scenario 2: Attempt to create unban with invalid banId
  await TestValidator.error("invalid banId error", async () => {
    await generate_random_discussion_board_administrator_user_bans_unban_create_unban(
      adminConnection,
      {
        params: { banId: "00000000-0000-0000-0000-000000000000" },
        body: {},
      },
    );
  });
  // Scenario 3: Unauthorized unban attempt by non-administrator
  const userConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError("unauthorized unban attempt", 403, async () => {
    await generate_random_discussion_board_administrator_user_bans_unban_create_unban(
      userConnection,
      {
        params: { banId },
        body: {},
      },
    );
  });
}
