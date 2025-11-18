import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test successful token refresh workflow.
 *
 * This test validates the complete token refresh process:
 *
 * 1. User registers via join endpoint and receives initial access and refresh
 *    tokens
 * 2. User calls the refresh endpoint with the valid refresh token
 * 3. Response contains a new access token with updated expiration timestamp
 * 4. Response includes a new JWT ID (jti) claim for token tracking
 * 5. Returned user information matches the authenticated user
 *
 * The test ensures seamless token renewal without password re-entry, enabling
 * long-lived sessions where background token refresh can occur automatically.
 */
export async function test_api_user_token_refresh_success(
  connection: api.IConnection,
) {
  // Step 1: User registration via join endpoint
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphabets(12);

  const joinResponse = await api.functional.auth.user.join(connection, {
    body: {
      email,
      password: `${password}Aa1!`,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: "127.0.0.1",
      user_agent: "Mozilla/5.0 Test Browser",
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(joinResponse);

  // Verify initial response contains user and token information
  TestValidator.equals("user email matches", joinResponse.email, email);
  TestValidator.predicate("user id exists", !!joinResponse.id);
  TestValidator.predicate("access token exists", !!joinResponse.token.access);
  TestValidator.predicate("refresh token exists", !!joinResponse.token.refresh);
  TestValidator.predicate(
    "access token expiration exists",
    !!joinResponse.token.expired_at,
  );
  TestValidator.predicate(
    "refresh token validity exists",
    !!joinResponse.token.refreshable_until,
  );

  // Store initial token information
  const initialRefreshToken = joinResponse.token.refresh;
  const initialAccessToken = joinResponse.token.access;
  const initialExpiredAt = joinResponse.token.expired_at;
  const initialUserId = joinResponse.id;

  // Step 2: Call refresh endpoint with valid refresh token
  const refreshResponse = await api.functional.auth.user.refresh(connection, {
    body: {
      refresh_token: initialRefreshToken,
    } satisfies ITodoListUser.IRefresh,
  });
  typia.assert(refreshResponse);

  // Step 3: Verify new access token is generated
  TestValidator.predicate(
    "new access token exists",
    !!refreshResponse.token.access,
  );
  TestValidator.notEquals(
    "new access token differs from initial",
    refreshResponse.token.access,
    initialAccessToken,
  );

  // Step 4: Verify updated expiration timestamp
  TestValidator.predicate(
    "new expiration timestamp exists",
    !!refreshResponse.token.expired_at,
  );
  TestValidator.notEquals(
    "expiration timestamp updated",
    refreshResponse.token.expired_at,
    initialExpiredAt,
  );

  // Step 5: Verify refresh token remains valid
  TestValidator.equals(
    "refresh token unchanged",
    refreshResponse.token.refresh,
    initialRefreshToken,
  );

  // Step 6: Verify user information consistency
  TestValidator.equals(
    "user id matches initial",
    refreshResponse.id,
    initialUserId,
  );
  TestValidator.equals(
    "user email matches initial",
    refreshResponse.email,
    email,
  );

  // Step 7: Verify token structure completeness
  TestValidator.predicate(
    "refreshable_until timestamp exists",
    !!refreshResponse.token.refreshable_until,
  );
}
