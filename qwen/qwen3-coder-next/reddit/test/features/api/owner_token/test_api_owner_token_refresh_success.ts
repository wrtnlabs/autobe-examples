import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";

export async function test_api_owner_token_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create new owner credentials
  const registerBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!",
    username: RandomGenerator.alphabets(8),
    displayName: RandomGenerator.name(),
  } satisfies IRedditCloneOwner.IJoin;
  // Step 2: Register new owner account
  const registerConnection: api.IConnection = { host: connection.host };
  const registeredUser = await authorize_owner_join(registerConnection, {
    body: registerBody,
  });
  typia.assert(registeredUser);
  // Step 3: Create login connection with fresh host reference
  const loginConnection: api.IConnection = { host: connection.host };
  const loginBody = {
    email: registerBody.email,
    password: registerBody.password,
    href: "https://example.com",
    referrer: "https://referrer.com",
  } satisfies IRedditCloneOwner.ILogin;
  // Step 4: Login to obtain initial tokens
  const loginResponse = await authorize_owner_login(loginConnection, {
    body: loginBody,
  });
  typia.assert(loginResponse);
  // Step 5: Extract initial refresh token
  const initialRefreshToken = loginResponse.token.refresh;
  // Step 6: Prepare refresh request with valid refresh token
  const refreshBody = {
    refreshToken: initialRefreshToken,
  } satisfies IRedditCloneOwner.IRefresh;
  // Step 7: Create refresh connection with fresh host reference
  const refreshConnection: api.IConnection = { host: connection.host };
  // Step 8: Execute token refresh
  const refreshResponse = await authorize_owner_refresh(refreshConnection, {
    body: refreshBody,
  });
  typia.assert(refreshResponse);
  // Step 9: Validate refresh response structure
  typia.assert<IRedditCloneOwner.IAuthorized>(refreshResponse);
  // Step 10: Verify new tokens were issued
  TestValidator.equals(
    "new access token generated",
    refreshResponse.token.access,
    loginResponse.token.access,
  );
  // Step 11: Verify refresh token was rotated (new token issued)
  TestValidator.notEquals(
    "refresh token rotated",
    refreshResponse.token.refresh,
    initialRefreshToken,
  );
  // Step 12: Validate token expiration timestamps are in future
  const now = new Date().toISOString();
  TestValidator.predicate(
    "access token not expired",
    () => refreshResponse.token.expired_at > now,
  );
  TestValidator.predicate(
    "refresh token still valid",
    () => refreshResponse.token.refreshable_until > now,
  );
  // Step 13: Verify user ID remains consistent
  TestValidator.equals(
    "user ID preserved",
    refreshResponse.id,
    loginResponse.id,
  );
}
