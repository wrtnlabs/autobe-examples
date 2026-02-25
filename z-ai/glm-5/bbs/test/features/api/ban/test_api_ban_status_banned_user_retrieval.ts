import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBan";
import type { IDiscussionBoardBanStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanStatus";
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
import { prepare_random_discussion_board_ban } from "../../../prepare/prepare_random_discussion_board_ban";

/**
 * Test that an administrator can successfully retrieve the ban status of a user
 * who has been banned from the platform. The test verifies the complete workflow:
 * 1) Create a target user to be banned, 2) Create an administrator user,
 * 3) The administrator bans the target user, 4) Retrieve and validate the ban status.
 */
export async function test_api_ban_status_banned_user_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create target user who will be banned
  const targetConnection: api.IConnection = { host: connection.host };
  const targetUser = await authorize_user_join(targetConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(targetUser);
  // 2. Create administrator user who will ban the target and check status
  const adminConnection: api.IConnection = { host: connection.host };
  const adminUser = await authorize_user_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(adminUser);
  // 3. Admin bans the target user with documented reason
  const banReason = RandomGenerator.paragraph({
    sentences: 3,
  }) satisfies string;
  const banRecord = await api.functional.discussionBoard.bans.create(
    adminConnection,
    {
      body: {
        userId: targetUser.id,
        reason: banReason,
      } satisfies IDiscussionBoardBan.ICreate,
    },
  );
  typia.assert(banRecord);
  // 4. Retrieve ban status of the banned user
  const banStatus =
    await api.functional.discussionBoard.user.users.ban_status.at(
      adminConnection,
      {
        userId: targetUser.id,
      },
    );
  typia.assert(banStatus);
  // 5. Validate the ban status response
  TestValidator.equals("isBanned should be true", banStatus.isBanned, true);
  TestValidator.predicate("ban record should exist", banStatus.ban !== null);
  if (banStatus.ban !== null) {
    TestValidator.equals("ban reason matches", banStatus.ban.reason, banReason);
    TestValidator.equals(
      "banned user ID matches",
      banStatus.ban.user.id,
      targetUser.id,
    );
    TestValidator.equals(
      "banned user email matches",
      banStatus.ban.user.email,
      targetUser.email,
    );
    TestValidator.equals(
      "banned user displayName matches",
      banStatus.ban.user.displayName,
      targetUser.displayName,
    );
    TestValidator.equals(
      "administrator ID matches",
      banStatus.ban.administrator?.id,
      adminUser.id,
    );
  }
}
