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
 * Test that a regular member (non-administrator) cannot access the ban status endpoint.
 *
 * This test validates the authorization boundary where only users with
 * ADMINISTRATOR or SUPER_ADMINISTRATOR permission level can access the
 * ban status endpoint. Regular members should receive 403 FORBIDDEN.
 *
 * Test Flow:
 * 1. Create a regular member user without administrator privileges
 * 2. Create a target user for the ban status query
 * 3. The regular member attempts to query the target user's ban status
 * 4. Validate that the system returns a 403 FORBIDDEN error
 */
export async function test_api_ban_status_member_authorization_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a regular member user (non-administrator)
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_user_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a target user whose ban status will be queried
  const targetConnection: api.IConnection = { host: connection.host };
  const targetUser = await authorize_user_join(targetConnection, {});
  typia.assert(targetUser);
  // 3. The regular member attempts to query the target user's ban status
  // This should fail with 403 FORBIDDEN because only ADMINISTRATOR or
  // SUPER_ADMINISTRATOR permission level can access this endpoint
  await TestValidator.httpError(
    "member cannot access ban status endpoint",
    403,
    async () => {
      await api.functional.discussionBoard.user.users.ban_status.at(
        memberConnection,
        { userId: targetUser.id },
      );
    },
  );
}
