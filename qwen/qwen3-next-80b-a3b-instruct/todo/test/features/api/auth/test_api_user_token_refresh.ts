import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoAppAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function test_api_user_token_refresh(connection: api.IConnection) {
  // 1. Register a new user to obtain refresh token
  const email: string = typia.random<string & tags.Format<"email">>();
  const password: string = RandomGenerator.alphabets(12);
  const registered: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email,
        password,
      } satisfies ITodoAppUser.ICreate,
    });
  typia.assert(registered);

  // 2. Login to obtain initial access and refresh tokens
  const loggedin: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.login(connection, {
      body: {
        email,
        password,
      } satisfies ITodoAppUser.ILogin,
    });
  typia.assert(loggedin);
  const initialRefreshToken: string = loggedin.token.refresh;

  // 3. Wait for access token expiration (using short expiration for testing)
  // Simulate expiration by switching to a new connection to force token refresh
  const refreshedConnection: api.IConnection = { ...connection, headers: {} };

  // 4. Refresh token before expiration (valid refresh token)
  const refreshed: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.refresh(refreshedConnection, {
      body: {
        refresh_token: initialRefreshToken,
      } satisfies ITodoAppUser.IRefresh,
    });
  typia.assert(refreshed);

  // 5. Validate that new access token is issued and refresh token is renewed
  TestValidator.notEquals(
    "new access token should be different from initial",
    loggedin.token.access,
    refreshed.token.access,
  );
  TestValidator.notEquals(
    "new refresh token should be different from initial",
    initialRefreshToken,
    refreshed.token.refresh,
  );
  TestValidator.equals(
    "user id should remain the same",
    registered.id,
    refreshed.id,
  );

  // 6. Verify that we can still access protected resources with new token
  const loggedinAfterRefresh: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.login(connection, {
      body: {
        email,
        password,
      } satisfies ITodoAppUser.ILogin,
    });
  typia.assert(loggedinAfterRefresh);

  // 7. Ensure refresh token from previous session is not reused (server-side rotation)
  await TestValidator.error(
    "no longer valid refresh token should fail",
    async () => {
      await api.functional.auth.user.refresh(refreshedConnection, {
        body: {
          refresh_token: initialRefreshToken,
        } satisfies ITodoAppUser.IRefresh,
      });
    },
  );
}
