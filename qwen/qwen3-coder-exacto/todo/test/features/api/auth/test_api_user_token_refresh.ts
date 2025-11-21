import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUserListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserListUser";

export async function test_api_user_token_refresh(connection: api.IConnection) {
  // Step 1: Register a new user to obtain initial tokens
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password123",
  } satisfies ITodoListUserListUser.IJoin;

  const joinResponse = await api.functional.auth.user.join(connection, {
    body: joinInput,
  });
  typia.assert(joinResponse);

  // Store the initial tokens for later comparison
  const initialAccessToken = joinResponse.token.access;
  const initialRefreshToken = joinResponse.token.refresh;
  const initialExpiredAt = joinResponse.token.expired_at;
  const initialRefreshableUntil = joinResponse.token.refreshable_until;

  // Step 2: Use the refresh token to get new tokens
  // Create a new connection with the refresh token in the Authorization header
  const refreshConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: `Bearer ${initialRefreshToken}`,
    },
  };

  const refreshResponse =
    await api.functional.auth.user.refresh(refreshConnection);
  typia.assert(refreshResponse);

  // Step 3: Validate that new tokens are different from the initial ones
  TestValidator.notEquals(
    "new access token should be different",
    refreshResponse.token.access,
    initialAccessToken,
  );

  TestValidator.notEquals(
    "new refresh token should be different",
    refreshResponse.token.refresh,
    initialRefreshToken,
  );

  // Step 4: Validate that the new tokens have proper expiration timestamps
  TestValidator.predicate("access token should have future expiration", () => {
    const expiredAt = new Date(refreshResponse.token.expired_at);
    return expiredAt > new Date();
  });

  TestValidator.predicate("refresh token should have future expiration", () => {
    const refreshableUntil = new Date(refreshResponse.token.refreshable_until);
    return refreshableUntil > new Date();
  });

  // Step 5: Validate that the refreshed tokens belong to the same user
  TestValidator.equals(
    "refreshed user ID should match original",
    refreshResponse.id,
    joinResponse.id,
  );

  TestValidator.equals(
    "refreshed user email should match original",
    refreshResponse.email,
    joinResponse.email,
  );

  // Step 6: Verify that the connection now has the new access token
  TestValidator.equals(
    "connection should have new access token",
    refreshConnection.headers?.Authorization,
    `Bearer ${refreshResponse.token.access}`,
  );
}
