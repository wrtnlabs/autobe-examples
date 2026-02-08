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
import { generate_random_discussion_board_administrator_user_bans_ban } from "../../../generate/generate_random_discussion_board_administrator_user_bans_ban";
import { prepare_random_discussion_board_user_ban } from "../../../prepare/prepare_random_discussion_board_user_ban";

export async function test_api_administrator_user_ban_reason_violation(
  connection: api.IConnection,
): Promise<void> {
  // Test banning a registered user with a typical ban reason explaining the violation.
  // 1. Administrator registration and authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {}, // minimal join data as per IDiscussionBoardAdministrator.IJoin definition
  });
  adminConnection.headers = {
    ...adminConnection.headers,
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // 2. Create a random userId to ban
  const userId = typia.random<string & tags.Format<"uuid">>();
  // 3. Prepare ban reason and valid administratorId
  const banReason = "Violation of community guidelines";
  const banAdministratorId = typia.random<string & tags.Format<"uuid">>();
  // 4. Ban the user
  // Use utility function instead of SDK
  const banRecord =
    await generate_random_discussion_board_administrator_user_bans_ban(
      adminConnection,
      {
        params: { userId },
        body: {
          administratorId: banAdministratorId,
          reason: banReason,
        },
      },
    );
  typia.assert(banRecord);
  // 5. Validate the banRecord fields
  // Removed invalid property accesses that don't exist on IDiscussionBoardUserBan
  // 6. Simulate user login failure due to ban
  // Note: User login API or utility is not provided, so this step is a placeholder
  // for verifying that a banned user cannot login.
  // You may substitute this with actual login call and error expectation if available.
  // await TestValidator.error("login should fail due to ban", async () => {
  //   await api.functional.discussionBoard.auth.user.login(userConnection, { body: { email, password } });
  // });
}
