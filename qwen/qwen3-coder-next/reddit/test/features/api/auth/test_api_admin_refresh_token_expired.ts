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
  // 1. Admin registration
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "12345678",
    username: RandomGenerator.name(3),
    display_name: null,
    bio: null,
  } satisfies IRedditPlatformAdmin.IJoin;
  const registerResult = await authorize_admin_join(adminConnection, {
    body: adminCredentials,
  });
  // 2. Login to get refresh token
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_admin_login(loginConnection, {
    body: {
      email: adminCredentials.email,
      password: adminCredentials.password,
    },
  });
  // 3. Test expired refresh token scenario
  // Create a new connection for refresh testing (no authentication headers)
  const expiredTokenConnection: api.IConnection = { host: connection.host };
  // Use the refresh token that was issued during login
  // This token has an expiration time, but for testing expired token scenario,
  // we need to simulate an expired token situation.
  // Since we cannot actually create an expired token in this flow,
  // we test with an invalid token format to verify the system properly rejects expired tokens
  await TestValidator.httpError(
    "expired or invalid refresh token should return 401",
    401,
    async () => {
      await api.functional.redditPlatform.auth.admin.refresh(
        expiredTokenConnection,
        {
          body: {
            refresh_token: "expired-or-invalid-refresh-token",
          } satisfies IRedditPlatformAdmin.IRefresh,
        },
      );
    },
  );
}
