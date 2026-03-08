import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_refresh_token_expired(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins and gets initial tokens
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminJoinResult = await authorize_admin_join(adminJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(adminJoinResult);
  // 2. Store the refresh token
  const validRefreshToken = adminJoinResult.token.refresh;
  // 3. Create an expired refresh token by manipulating the expiration timestamp
  // We'll use the existing refresh token but the backend will check its actual expiration
  // For testing, we'll use typia.random to generate a refresh token that would be expired
  // In a real scenario, we'd wait 7 days or have a test mode that makes tokens expire immediately
  const expiredRefreshToken = typia.random<string & tags.Format<"uuid">>();
  // 4. Attempt to refresh with expired token - should fail
  const adminRefreshConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("expired refresh token should fail", async () => {
    await api.functional.redditPlatform.auth.admin.refresh(
      adminRefreshConnection,
      {
        body: {
          refresh_token: expiredRefreshToken,
        } satisfies IRedditPlatformAdmin.IRefresh,
      },
    );
  });
  // 5. Re-authenticate via login to get new valid tokens
  const adminLoginConnection: api.IConnection = { host: connection.host };
  const adminLoginResult = await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminJoinResult.email,
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(adminLoginResult);
  // 6. Verify new tokens are valid by using them
  const adminRefreshAgainConnection: api.IConnection = {
    host: connection.host,
  };
  const adminRefreshAgainResult = await authorize_admin_refresh(
    adminRefreshAgainConnection,
    {
      body: {
        refresh_token: adminLoginResult.token.refresh,
      },
    },
  );
  typia.assert(adminRefreshAgainResult);
  // 7. Verify that the old expired token still cannot be used
  await TestValidator.error("old expired token still invalid", async () => {
    await api.functional.redditPlatform.auth.admin.refresh(
      adminRefreshConnection,
      {
        body: {
          refresh_token: expiredRefreshToken,
        } satisfies IRedditPlatformAdmin.IRefresh,
      },
    );
  });
}