import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBan";
import type { IDiscussionBoardUnban } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUnban";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_bans_create } from "../../../generate/generate_random_discussion_board_bans_create";
import { generate_random_discussion_board_unbans_create } from "../../../generate/generate_random_discussion_board_unbans_create";
import { prepare_random_discussion_board_ban } from "../../../prepare/prepare_random_discussion_board_ban";
import { prepare_random_discussion_board_unban } from "../../../prepare/prepare_random_discussion_board_unban";

export async function test_api_unban_already_unbanned(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin user who will perform ban/unban actions
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_user_join(adminConnection, {});
  typia.assert(admin);
  // 2. Create target user who will be banned
  const targetConnection: api.IConnection = { host: connection.host };
  const target = await authorize_user_join(targetConnection, {});
  typia.assert(target);
  // 3. Create a ban record (admin bans target user)
  const ban = await generate_random_discussion_board_bans_create(
    adminConnection,
    {
      body: {
        userId: target.id,
        reason: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(ban);
  // 4. Create an unban for that ban
  const unban = await generate_random_discussion_board_unbans_create(
    adminConnection,
    {
      body: {
        discussion_board_ban_id: ban.id,
        reason: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(unban);
  // 5. Attempt to create a second unban for the same ban record
  // This should fail because the unique constraint on discussion_board_unbans.discussion_board_ban_id
  await TestValidator.error("duplicate unban should fail", async () => {
    await generate_random_discussion_board_unbans_create(adminConnection, {
      body: {
        discussion_board_ban_id: ban.id,
        reason: RandomGenerator.paragraph({ sentences: 3 }),
      },
    });
  });
}
