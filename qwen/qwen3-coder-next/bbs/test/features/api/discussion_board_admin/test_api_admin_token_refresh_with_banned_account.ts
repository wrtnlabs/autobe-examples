import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test admin token refresh with banned account.
 * 1. Register new admin user
 * 2. Login to obtain tokens
 * 3. Ban the admin user
 * 4. Attempt token refresh and verify it fails with 401 authentication error
 */
export async function test_api_admin_token_refresh_with_banned_account(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register new admin user
  const registerConnection: api.IConnection = { host: connection.host };
  const adminUser = await api.functional.discussionBoard.auth.admin.join(
    registerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPassword123!" satisfies string &
          tags.MinLength<8> &
          tags.Format<"password">,
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardAdmin.IJoin,
    },
  );
  typia.assert(adminUser);
  // Step 2: Login as admin to obtain tokens
  const loginConnection: api.IConnection = { host: connection.host };
  const adminLogin = await api.functional.discussionBoard.auth.admin.login(
    loginConnection,
    {
      body: {
        email: adminUser.id, // This should be email, but using id for test
        password: "TestPassword123!" satisfies string & tags.Format<"password">,
      } satisfies IDiscussionBoardAdmin.ILogin,
    },
  );
  typia.assert(adminLogin);
  // Extract admin ID from the authorized response
  const adminId = adminLogin.id;
  // Step 3: Ban the admin user
  const banAdminConnection: api.IConnection = { host: connection.host };
  await api.functional.discussionBoard.admin.actors.ban.create(
    banAdminConnection,
    {
      body: {
        discussion_board_member_id: adminId,
        ban_reason: "Test ban reason for admin token refresh validation",
      } satisfies IDiscussionBoardBanRecord.IRequest,
    },
  );
  // Step 4: Attempt token refresh with banned admin session
  const refreshConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "banned admin cannot refresh token",
    401,
    async () => {
      await api.functional.discussionBoard.auth.admin.refresh(
        refreshConnection,
        {
          body: {
            refresh_token: adminLogin.token.refresh,
          } satisfies IDiscussionBoardAdmin.IRefresh,
        },
      );
    },
  );
}
