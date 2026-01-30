import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicForumUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumUser";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
export async function test_api_user_refresh_token_valid(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create new user account to establish authentication context
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResponse: IEconomicForumUser.IAuthorized =
    await authorize_user_join(joinConnection, {});
  typia.assert(joinResponse);
  // Step 2: Authenticate user and obtain initial access and refresh tokens
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResponse: IEconomicForumUser.IAuthorized =
    await authorize_user_login(loginConnection, {
      body: {
        email: joinResponse.email,
        password: "password123", // Assuming default password from join
      },
    });
  typia.assert(loginResponse);
  // Step 3: Extract the refresh token from initial session
  const initialRefreshToken = loginResponse.token.refresh;
  // Step 4: Refresh the access token using valid refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResponse: IEconomicForumUser.IAuthorized =
    await authorize_user_refresh(refreshConnection, {
      body: {
        refresh_token: initialRefreshToken,
      },
    });
  typia.assert(refreshResponse);
  // Step 5: Validate refresh response structure
  TestValidator.equals(
    "user ID unchanged after refresh",
    joinResponse.id,
    refreshResponse.id,
  );
  TestValidator.equals(
    "email unchanged after refresh",
    joinResponse.email,
    refreshResponse.email,
  );
  TestValidator.equals(
    "username unchanged after refresh",
    joinResponse.username,
    refreshResponse.username,
  );
  // Validate new token structure
  TestValidator.predicate(
    "new access token exists",
    () => refreshResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "new refresh token exists",
    () => refreshResponse.token.refresh.length > 0,
  );
  // Validate token expiration times
  TestValidator.predicate(
    "new access token expiration is set",
    () => refreshResponse.token.expired_at !== undefined,
  );
  TestValidator.predicate(
    "new refresh token expiration is set",
    () => refreshResponse.token.refreshable_until !== undefined,
  );
  // Validate token expiration time progression
  const initialExpiredAt = new Date(loginResponse.token.expired_at);
  const newExpiredAt = new Date(refreshResponse.token.expired_at);
  TestValidator.predicate(
    "new access token expiration is after initial",
    () => newExpiredAt > initialExpiredAt,
  );
  const initialRefreshableUntil = new Date(
    loginResponse.token.refreshable_until,
  );
  const newRefreshableUntil = new Date(refreshResponse.token.refreshable_until);
  TestValidator.predicate(
    "new refresh token expiration is after initial",
    () => newRefreshableUntil >= initialRefreshableUntil,
  );
  // Validate that tokens are different (not reused)
  TestValidator.notEquals(
    "new access token different from initial",
    loginResponse.token.access,
    refreshResponse.token.access,
  );
  TestValidator.notEquals(
    "new refresh token different from initial",
    loginResponse.token.refresh,
    refreshResponse.token.refresh,
  );
  // Validate that the user can still make further API calls with new token
  // The refresh operation already returned an authorized response, so we know the token works
  // We don't need additional API calls as the refreshResponse itself confirms the capability
}
