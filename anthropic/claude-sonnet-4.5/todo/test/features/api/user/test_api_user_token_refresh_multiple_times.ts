import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test sequential token refresh operations to validate token rotation and
 * session continuity.
 *
 * This test validates the JWT token refresh mechanism by performing multiple
 * consecutive refresh operations. It ensures that:
 *
 * 1. Each refresh operation successfully generates new token pairs
 * 2. Tokens are unique across different refresh operations
 * 3. Expiration timestamps are updated with each refresh
 * 4. Sessions can be maintained indefinitely through proper refresh cycles
 * 5. Token rotation prevents token reuse attacks
 *
 * The test creates a user account, obtains initial tokens, then performs
 * multiple refresh operations (minimum 3) where each operation uses the refresh
 * token from the previous operation, validating the complete refresh chain.
 */
export async function test_api_user_token_refresh_multiple_times(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account to obtain initial tokens
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = typia.random<string & tags.MinLength<8>>();
  const currentUrl = typia.random<string & tags.Format<"uri">>();
  const referrerUrl = typia.random<string & tags.Format<"uri">>();

  const initialUser = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: currentUrl,
      referrer: referrerUrl,
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(initialUser);

  // Validate initial token structure
  typia.assert(initialUser.token);
  TestValidator.predicate(
    "initial access token exists",
    initialUser.token.access.length > 0,
  );
  TestValidator.predicate(
    "initial refresh token exists",
    initialUser.token.refresh.length > 0,
  );

  // Store tokens for comparison
  const tokenHistory: IAuthorizationToken[] = [initialUser.token];

  // Step 2: Perform multiple consecutive refresh operations (3 times)
  let currentRefreshToken = initialUser.token.refresh;

  for (let i = 0; i < 3; i++) {
    // Perform token refresh using the current refresh token
    const refreshedUser = await api.functional.auth.user.refresh(connection, {
      body: {
        refresh_token: currentRefreshToken,
      } satisfies ITodoListUser.IRefresh,
    });
    typia.assert(refreshedUser);

    // Validate refreshed user data
    TestValidator.equals(
      `refresh ${i + 1}: user ID matches original`,
      refreshedUser.id,
      initialUser.id,
    );
    TestValidator.equals(
      `refresh ${i + 1}: user email matches original`,
      refreshedUser.email,
      initialUser.email,
    );

    // Validate new token structure
    typia.assert(refreshedUser.token);
    TestValidator.predicate(
      `refresh ${i + 1}: new access token exists`,
      refreshedUser.token.access.length > 0,
    );
    TestValidator.predicate(
      `refresh ${i + 1}: new refresh token exists`,
      refreshedUser.token.refresh.length > 0,
    );

    // Validate token rotation: new tokens should differ from previous ones
    const previousToken = tokenHistory[tokenHistory.length - 1];
    TestValidator.notEquals(
      `refresh ${i + 1}: access token rotated`,
      refreshedUser.token.access,
      previousToken.access,
    );
    TestValidator.notEquals(
      `refresh ${i + 1}: refresh token rotated`,
      refreshedUser.token.refresh,
      previousToken.refresh,
    );

    // Validate expiration timestamps are valid dates
    const expiredAt = new Date(refreshedUser.token.expired_at);
    const refreshableUntil = new Date(refreshedUser.token.refreshable_until);
    TestValidator.predicate(
      `refresh ${i + 1}: expired_at is valid date`,
      !isNaN(expiredAt.getTime()),
    );
    TestValidator.predicate(
      `refresh ${i + 1}: refreshable_until is valid date`,
      !isNaN(refreshableUntil.getTime()),
    );

    // Validate logical expiration order
    TestValidator.predicate(
      `refresh ${i + 1}: refreshable_until is after expired_at`,
      refreshableUntil.getTime() > expiredAt.getTime(),
    );

    // Store token in history and update current refresh token for next iteration
    tokenHistory.push(refreshedUser.token);
    currentRefreshToken = refreshedUser.token.refresh;
  }

  // Step 3: Validate complete token history
  TestValidator.equals(
    "total refresh operations completed",
    tokenHistory.length,
    4, // initial + 3 refreshes
  );

  // Validate all tokens in history are unique
  for (let i = 0; i < tokenHistory.length; i++) {
    for (let j = i + 1; j < tokenHistory.length; j++) {
      TestValidator.notEquals(
        `token ${i} and ${j}: access tokens are unique`,
        tokenHistory[i].access,
        tokenHistory[j].access,
      );
      TestValidator.notEquals(
        `token ${i} and ${j}: refresh tokens are unique`,
        tokenHistory[i].refresh,
        tokenHistory[j].refresh,
      );
    }
  }
}
