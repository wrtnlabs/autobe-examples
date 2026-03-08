import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_token_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for admin operations
  const adminConnection: api.IConnection = { host: connection.host };
  // 1. Create new admin account
  const joinInput = {
    email: typia.random<string & tags.MinLength<1> & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(1),
    display_name: RandomGenerator.name(),
    bio: null,
    avatar_url: null,
  } satisfies IRedditLikeAdmin.IJoin;
  const joined = await api.functional.redditLike.auth.admin.join(
    adminConnection,
    {
      body: joinInput,
    },
  );
  typia.assert(joined);
  // 2. Login with the new admin account to establish session and get tokens
  const loginBody: IRedditLikeAdmin.ILogin = {
    email: joinInput.email,
    password: joinInput.password,
  };
  const logged = await api.functional.redditLike.auth.admin.login(
    adminConnection,
    {
      body: loginBody,
    },
  );
  typia.assert(logged);
  // 3. Extract refresh token and prepare refresh request
  const refreshBody: IRedditLikeAdmin.IRefresh = {
    refresh_token: logged.token.refresh,
  };
  // 4. Call refresh endpoint with valid refresh token
  const refreshed = await api.functional.redditLike.auth.admin.refresh(
    adminConnection,
    {
      body: refreshBody,
    },
  );
  typia.assert(refreshed);
  // 5. Validate response structure - new tokens should be issued
  TestValidator.equals(
    "new access token exists",
    typeof refreshed.token.access,
    "string",
  );
  TestValidator.equals(
    "new refresh token exists",
    typeof refreshed.token.refresh,
    "string",
  );
  TestValidator.equals(
    "expired_at exists",
    typeof refreshed.token.expired_at,
    "string",
  );
  TestValidator.equals(
    "refreshable_until exists",
    typeof refreshed.token.refreshable_until,
    "string",
  );
  // 6. Validate admin identity is preserved
  TestValidator.equals("admin ID matches", refreshed.admin.id, joined.admin.id);
  TestValidator.equals(
    "admin username matches",
    refreshed.admin.username,
    joined.admin.username,
  );
  TestValidator.equals(
    "admin display_name matches",
    refreshed.admin.display_name,
    joined.admin.display_name,
  );
  // 7. Verify token rotation - new refresh token should be different from old one
  TestValidator.notEquals(
    "refresh token rotated",
    refreshed.token.refresh,
    logged.token.refresh,
  );
  TestValidator.notEquals(
    "access token rotated",
    refreshed.token.access,
    logged.token.access,
  );
  // 8. Verify new access token is valid by calling another admin endpoint
  // Using the summary endpoint as a test (admin profile retrieval)
  const summary = await api.functional.redditLike.auth.admin.login(
    { host: adminConnection.host },
    {
      body: {
        email: joinInput.email,
        password: joinInput.password,
      } satisfies IRedditLikeAdmin.ILogin,
    },
  );
  typia.assert(summary);
}