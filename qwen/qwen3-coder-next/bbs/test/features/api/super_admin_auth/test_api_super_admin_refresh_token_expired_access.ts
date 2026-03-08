import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_refresh_token_expired_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new super admin account
  const registerInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardSuperAdmin.IJoin;
  const registered = await api.functional.discussionBoard.auth.superAdmin.join(
    connection,
    {
      body: registerInput,
    },
  );
  typia.assert(registered);
  // 2. Login as the super admin to establish session
  const loginInput = {
    email: registered.email,
    password: registerInput.password,
  } satisfies IDiscussionBoardSuperAdmin.ILogin;
  const loggedin = await api.functional.discussionBoard.auth.superAdmin.login(
    connection,
    {
      body: loginInput,
    },
  );
  typia.assert(loggedin);
  // 3. Verify tokens are valid initially
  const initialExpiredAt = new Date(loggedin.token.expired_at).getTime();
  const initialRefreshableUntil = new Date(
    loggedin.token.refreshable_until,
  ).getTime();
  const currentTime = new Date().getTime();
  TestValidator.predicate(
    "initial access token is valid",
    () => initialExpiredAt > currentTime,
  );
  TestValidator.predicate(
    "initial refresh token is valid",
    () => initialRefreshableUntil > currentTime,
  );
  // 4. Wait for access token to expire (but keep refresh token valid)
  const timeUntilExpire = initialExpiredAt - currentTime;
  if (timeUntilExpire > 0) {
    await new Promise((resolve) => setTimeout(resolve, timeUntilExpire + 1000));
  }
  // 5. Attempt refresh with valid refresh token
  const refreshInput = {
    refresh_token: loggedin.token.refresh,
  } satisfies IDiscussionBoardSuperAdmin.IRefresh;
  const refreshed =
    await api.functional.discussionBoard.auth.superAdmin.refresh(connection, {
      body: refreshInput,
    });
  typia.assert(refreshed);
  // 6. Verify new access token is issued without requiring re-authentication
  TestValidator.notEquals(
    "new access token is different from old",
    refreshed.token.access,
    loggedin.token.access,
  );
  // 7. Verify refresh token rotation occurs
  TestValidator.notEquals(
    "refresh token is rotated",
    refreshed.token.refresh,
    loggedin.token.refresh,
  );
  // 8. Verify new access token has future expiration
  const newExpiredAt = new Date(refreshed.token.expired_at).getTime();
  TestValidator.predicate(
    "new access token has future expiration",
    () => newExpiredAt > new Date().getTime(),
  );
  // 9. Verify new refresh token is still valid
  const newRefreshableUntil = new Date(
    refreshed.token.refreshable_until,
  ).getTime();
  TestValidator.predicate(
    "new refresh token is still valid",
    () => newRefreshableUntil > new Date().getTime(),
  );
  // 10. Verify old access token is now invalidated (should fail if used)
  const oldAccessConnection: api.IConnection = { host: connection.host };
  oldAccessConnection.headers = {
    Authorization: loggedin.token.access,
  };
  await TestValidator.httpError(
    "old access token is invalidated",
    401,
    async () => {
      await api.functional.discussionBoard.auth.superAdmin.refresh(
        oldAccessConnection,
        {
          body: {
            refresh_token: loggedin.token.refresh,
          },
        },
      );
    },
  );
}
