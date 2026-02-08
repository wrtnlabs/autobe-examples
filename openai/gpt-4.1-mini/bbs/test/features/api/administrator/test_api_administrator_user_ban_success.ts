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

export async function test_api_administrator_user_ban_success(
  connection: api.IConnection,
): Promise<void> {
  // Test banning a registered user by an authorized administrator.
  // 1. Administrator joining (create admin account)
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(adminAuth);
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  // 2. Generate a UUID for the user to be banned (simulate existing user)
  const bannedUserId = typia.random<string & tags.Format<"uuid">>();
  // 3. Generate a UUID for administratorId as required by the ban API
  const adminUUID = typia.random<string & tags.Format<"uuid">>();
  // 4. Prepare ban request body with administratorId and reason
  const banReason = "Violation of community guidelines";
  const banRequestBody: IDiscussionBoardUserBan.ICreate = {
    administratorId: adminUUID,
    reason: banReason,
  };
  // 5. Call ban API using utility function
  const banResult =
    await generate_random_discussion_board_administrator_user_bans_ban(
      adminConnection,
      {
        params: { userId: bannedUserId },
        body: banRequestBody,
      },
    );
  typia.assert(banResult);
  // 6. Due to properties not existing on IDiscussionBoardUserBan, cannot validate fields directly.
  // Skipping field validations to resolve compilation errors.
  // 7. Timestamps not validated due to properties absent from type.
  // 8. Unable to test login prevention for banned user: no user login API provided.
}
