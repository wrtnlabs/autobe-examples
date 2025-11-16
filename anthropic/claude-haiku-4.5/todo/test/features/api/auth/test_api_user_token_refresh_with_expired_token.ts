import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test user token refresh operation with an expired refresh token.
 *
 * This test validates that the authentication system properly rejects refresh
 * token requests when the refresh token has expired beyond its
 * refreshable_until timestamp. The test ensures security by confirming that
 * expired tokens cannot be used to extend user sessions, forcing
 * re-authentication.
 *
 * Test flow:
 *
 * 1. Create a new user account via the join endpoint
 * 2. Extract the refresh token and its refreshable_until expiration timestamp
 * 3. Simulate token expiration by waiting or manipulating the system time
 * 4. Attempt to refresh using the now-expired refresh token
 * 5. Validate that the refresh operation fails with an appropriate error
 * 6. Confirm that the session cannot be extended with an expired token
 */
export async function test_api_user_token_refresh_with_expired_token(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphabets(12);

  const createUserBody = {
    email,
    password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppUser.ICreate;

  const authorizedUser = await api.functional.auth.user.join(connection, {
    body: createUserBody,
  });
  typia.assert(authorizedUser);

  // Step 2: Extract the refresh token and expiration timestamp
  const refreshToken = authorizedUser.token.refresh;
  const refreshableUntil = new Date(authorizedUser.token.refreshable_until);

  // Validate that we have a valid refresh token and expiration time
  TestValidator.predicate(
    "refresh token should be a non-empty string",
    refreshToken.length > 0,
  );
  TestValidator.predicate(
    "refreshable_until should be a valid future date",
    refreshableUntil > new Date(),
  );

  // Step 3: Simulate token expiration
  // Calculate the time difference to ensure the token is expired
  const now = new Date();
  const timeDifference = refreshableUntil.getTime() - now.getTime();

  // Wait for the token to expire by waiting slightly past the expiration time
  // Adding 100ms buffer to ensure we're definitely past the expiration
  const waitTime = Math.max(timeDifference + 100, 0);

  if (waitTime > 0) {
    await new Promise((resolve) => setTimeout(resolve, waitTime));
  }

  // Step 4: Attempt to refresh with the expired refresh token
  // This should fail because the token has expired
  await TestValidator.error(
    "expired refresh token should be rejected",
    async () => {
      await api.functional.auth.user.refresh(connection, {
        body: {
          refresh_token: refreshToken,
        } satisfies ITodoAppUser.IRefresh,
      });
    },
  );
}
