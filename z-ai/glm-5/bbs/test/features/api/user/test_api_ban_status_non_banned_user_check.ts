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

/**
 * Test that an administrator can successfully retrieve the ban status of a user who has never been banned.
 *
 * Workflow:
 * 1. Create an admin user who will perform the ban status check
 * 2. Create a target user who has never been banned
 * 3. The admin queries the target user's ban status
 * 4. Validate that isBanned=false and ban is null
 */
export async function test_api_ban_status_non_banned_user_check(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin user (will have MEMBER permission by default)
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_user_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(adminAuth);
  // 2. Create target user who has never been banned
  const targetConnection: api.IConnection = { host: connection.host };
  const targetAuth = await authorize_user_join(targetConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(targetAuth);
  // 3. Query the target user's ban status using admin connection
  const banStatus =
    await api.functional.discussionBoard.user.users.ban_status.at(
      adminConnection,
      {
        userId: targetAuth.id,
      },
    );
  typia.assert(banStatus);
  // 4. Validate that user is not banned
  TestValidator.equals("user is not banned", banStatus.isBanned, false);
  TestValidator.equals("ban record is null", banStatus.ban, null);
}
