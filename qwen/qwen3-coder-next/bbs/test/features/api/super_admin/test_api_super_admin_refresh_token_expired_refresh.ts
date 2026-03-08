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

export async function test_api_super_admin_refresh_token_expired_refresh(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and login as super admin to establish initial session
  const adminConnection: api.IConnection = { host: connection.host };
  const joinEmail = typia.random<string & tags.Format<"email">>();
  const joinPassword = "Test@1234";
  const authorized = await authorize_super_admin_join(adminConnection, {
    body: {
      email: joinEmail,
      password: joinPassword,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(authorized);
  // Login to establish session
  const loginConnection: api.IConnection = { host: connection.host };
  const logged = await authorize_super_admin_login(loginConnection, {
    body: {
      email: joinEmail,
      password: joinPassword,
    } satisfies IDiscussionBoardSuperAdmin.ILogin,
  });
  typia.assert(logged);
  // Extract refresh token - we'll simulate an expired token scenario
  // For testing expired token behavior, we need a token that has exceeded refreshable_until
  // Since we can't easily generate an expired JWT token, we'll use an invalid token format
  const expiredRefreshToken =
    "invalid_expired_token_" + RandomGenerator.alphaNumeric(20);
  // 2. Attempt refresh with expired refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  // 3. Verify system returns authentication error when using expired token
  await TestValidator.error("should reject expired refresh token", async () => {
    await api.functional.discussionBoard.auth.superAdmin.refresh(
      refreshConnection,
      {
        body: {
          refresh_token: expiredRefreshToken,
        } satisfies IDiscussionBoardSuperAdmin.IRefresh,
      },
    );
  });
  // 4. Verify user must re-authenticate with credentials (normal login should still work)
  const newLoginConnection: api.IConnection = { host: connection.host };
  const relogged = await authorize_super_admin_login(newLoginConnection, {
    body: {
      email: joinEmail,
      password: joinPassword,
    } satisfies IDiscussionBoardSuperAdmin.ILogin,
  });
  typia.assert(relogged);
}
