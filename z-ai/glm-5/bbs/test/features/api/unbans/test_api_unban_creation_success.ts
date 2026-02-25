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

export async function test_api_unban_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin user who will perform the unban action
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_user_join(adminConnection, {});
  typia.assert(adminAuth);
  // 2. Create target user who will be banned
  const targetConnection: api.IConnection = { host: connection.host };
  const targetAuth = await authorize_user_join(targetConnection, {});
  typia.assert(targetAuth);
  // 3. Admin bans the target user
  const banReason = RandomGenerator.paragraph({ sentences: 5 });
  const ban = await api.functional.discussionBoard.bans.create(
    adminConnection,
    {
      body: {
        userId: targetAuth.id,
        reason: banReason,
      } satisfies IDiscussionBoardBan.ICreate,
    },
  );
  typia.assert(ban);
  // 4. Admin creates an unban for that ban
  const unbanReason = RandomGenerator.paragraph({ sentences: 5 });
  const unban = await api.functional.discussionBoard.unbans.create(
    adminConnection,
    {
      body: {
        discussion_board_ban_id: ban.id,
        reason: unbanReason,
      } satisfies IDiscussionBoardUnban.ICreate,
    },
  );
  typia.assert(unban);
  // 5. Validate unban record
  TestValidator.equals("unban references correct ban", unban.ban.id, ban.id);
  TestValidator.equals(
    "unban administrator is correct",
    unban.administrator.id,
    adminAuth.id,
  );
  TestValidator.equals("unban reason matches input", unban.reason, unbanReason);
  TestValidator.predicate(
    "unban has valid creation timestamp",
    unban.createdAt.length > 0,
  );
  // 6. Verify original ban record remains intact
  TestValidator.equals("ban user is correct", unban.ban.user.id, targetAuth.id);
  TestValidator.equals("ban reason preserved", unban.ban.reason, banReason);
}
