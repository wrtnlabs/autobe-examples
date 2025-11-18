import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validates that token refresh updates session activity timestamp.
 *
 * This test verifies the token refresh flow for authenticated users. When a
 * user calls the token refresh endpoint with a valid refresh token, the system
 * should issue a new access token and update the session's last_activity_at
 * timestamp to reflect active token usage. This is crucial for session
 * management, enabling the system to track when users actively refresh their
 * authentication and distinguishing between active and stale sessions.
 *
 * The test flow:
 *
 * 1. Create a new user account to establish initial tokens
 * 2. Extract the refresh token from the registration response
 * 3. Call the refresh endpoint with the refresh token
 * 4. Validate successful token refresh with new access token
 * 5. Verify token structure and expiration information
 */
export async function test_api_user_token_refresh_session_activity_update(
  connection: api.IConnection,
) {
  // Step 1: Create a user account for testing token refresh
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphabets(12); // 12 character password meeting 8+ requirement
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();

  const joinResponse: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email,
        password,
        href,
        referrer,
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(joinResponse);

  // Validate user account was created with required fields
  TestValidator.equals("created user email matches", joinResponse.email, email);
  TestValidator.predicate("user has valid ID", () =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      joinResponse.id,
    ),
  );
  TestValidator.predicate(
    "user account is active",
    joinResponse.deleted_at === null,
  );

  // Step 2: Extract refresh token from join response
  const refreshToken = joinResponse.token.refresh;
  TestValidator.predicate(
    "refresh token is not empty",
    refreshToken.length > 0,
  );

  // Step 3: Call refresh endpoint with valid refresh token
  const refreshResponse: ITodoListUser.IAuthorized =
    await api.functional.auth.user.refresh(connection, {
      body: {
        refresh_token: refreshToken,
      } satisfies ITodoListUser.IRefresh,
    });
  typia.assert(refreshResponse);

  // Step 4: Validate token refresh response structure and content
  TestValidator.equals(
    "refreshed response contains same user ID",
    refreshResponse.id,
    joinResponse.id,
  );

  TestValidator.equals(
    "refreshed response contains same email",
    refreshResponse.email,
    joinResponse.email,
  );

  // Step 5: Verify new access token was issued
  TestValidator.predicate(
    "new access token exists",
    refreshResponse.token.access.length > 0,
  );

  TestValidator.predicate(
    "new refresh token exists",
    refreshResponse.token.refresh.length > 0,
  );

  // Step 6: Validate token expiration information is present
  TestValidator.predicate(
    "access token expiration is set",
    new Date(refreshResponse.token.expired_at) > new Date(),
  );

  TestValidator.predicate(
    "refresh token expiration is set",
    new Date(refreshResponse.token.refreshable_until) > new Date(),
  );

  // Step 7: Verify timestamps are in valid ISO 8601 format
  TestValidator.predicate(
    "access token expiration is valid ISO date",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      refreshResponse.token.expired_at,
    ),
  );

  TestValidator.predicate(
    "refresh token expiration is valid ISO date",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      refreshResponse.token.refreshable_until,
    ),
  );

  // Step 8: Confirm user profile data integrity
  TestValidator.predicate(
    "user created_at timestamp exists",
    refreshResponse.created_at !== null &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(refreshResponse.created_at),
  );

  TestValidator.predicate(
    "user updated_at timestamp exists",
    refreshResponse.updated_at !== null &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(refreshResponse.updated_at),
  );

  // Step 9: Verify account is not deleted after token refresh
  TestValidator.predicate(
    "account remains active after refresh",
    refreshResponse.deleted_at === null,
  );
}
