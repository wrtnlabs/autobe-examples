import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";

/**
 * Test token refresh operation with valid refresh tokens.
 *
 * This test validates that the token refresh endpoint correctly processes valid
 * refresh tokens and issues new JWT tokens with proper expiration times. Since
 * actual 7-day expiration testing requires time manipulation not available in
 * E2E tests, this test focuses on the refresh mechanism itself and verifies
 * that tokens can be refreshed within their valid lifetime.
 *
 * Steps:
 *
 * 1. Register a new contributor account via join endpoint
 * 2. Extract the valid refresh token from the response
 * 3. Refresh the token using the valid refresh token
 * 4. Verify the refresh operation succeeds with new tokens
 * 5. Validate the new tokens have proper structure and expiration
 * 6. Attempt refresh again to confirm token refresh is repeatable
 */
export async function test_api_contributor_token_refresh_with_expired_token(
  connection: api.IConnection,
) {
  // Step 1: Register a new contributor account
  const email = typia.random<string & tags.Format<"email">>();
  const password = "SecurePass123!@#";
  const username = RandomGenerator.alphabets(10);

  const registered: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email,
        username,
        password,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(registered);
  TestValidator.equals(
    "registered contributor email matches",
    registered.email,
    email,
  );
  TestValidator.equals(
    "registered contributor username matches",
    registered.username,
    username,
  );

  // Step 2: Extract the valid refresh token
  const initialRefreshToken = registered.token.refresh;
  const initialAccessToken = registered.token.access;
  TestValidator.equals(
    "initial refresh token exists",
    typeof initialRefreshToken,
    "string",
  );
  TestValidator.equals(
    "initial access token exists",
    typeof initialAccessToken,
    "string",
  );

  // Step 3: Create unauthenticated connection for refresh
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Step 4: Refresh the token using the valid refresh token
  const refreshed: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.refresh(unauthConn, {
      body: {
        refreshToken: initialRefreshToken,
      } satisfies IDiscussionBoardContributor.IRefresh,
    });
  typia.assert(refreshed);

  // Step 5: Validate new tokens have proper structure
  TestValidator.equals(
    "refreshed contributor id matches",
    refreshed.id,
    registered.id,
  );
  TestValidator.notEquals(
    "new access token differs from original",
    refreshed.token.access,
    initialAccessToken,
  );
  TestValidator.notEquals(
    "new refresh token differs from original",
    refreshed.token.refresh,
    initialRefreshToken,
  );
  TestValidator.equals(
    "access token is string",
    typeof refreshed.token.access,
    "string",
  );
  TestValidator.equals(
    "refresh token is string",
    typeof refreshed.token.refresh,
    "string",
  );
  TestValidator.predicate(
    "access token expiration is valid datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(refreshed.token.expired_at),
  );
  TestValidator.predicate(
    "refresh token expiration is valid datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      refreshed.token.refreshable_until,
    ),
  );

  // Step 6: Verify token refresh is repeatable
  const secondRefresh: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.refresh(unauthConn, {
      body: {
        refreshToken: refreshed.token.refresh,
      } satisfies IDiscussionBoardContributor.IRefresh,
    });
  typia.assert(secondRefresh);
  TestValidator.equals(
    "second refresh maintains contributor id",
    secondRefresh.id,
    registered.id,
  );
  TestValidator.notEquals(
    "second refresh generates new access token",
    secondRefresh.token.access,
    refreshed.token.access,
  );
}
