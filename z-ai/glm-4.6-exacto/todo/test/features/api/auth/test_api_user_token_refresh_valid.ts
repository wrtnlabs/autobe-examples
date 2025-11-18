import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test refreshing JWT tokens for a user with a valid refresh token.
 *
 * Validates the /auth/user/refresh endpoint by simulating the scenario where an
 * existing user has a non-expired refresh token (issued during successful
 * login/join) and submits it for renewal. Successful response must include new
 * tokens in the response and return correct session information (user id,
 * email, created_at, updated_at, deleted_at, token block). The test checks that
 * the structure of issued tokens is valid, and their expiration times are in
 * the future.
 *
 * Steps:
 *
 * 1. Generate a fake authorized user session (simulates join or login).
 * 2. Request token refresh using the previously issued refresh token from the
 *    authorized session.
 * 3. Assert that a new authorized session is returned with valid fields, and
 *    returned token information is updated.
 * 4. Assert that user identity (id, email) is preserved, but the access and
 *    refresh tokens have changed.
 * 5. Optionally, check that expired_at and refreshable_until in token are proper
 *    valid ISO date-times in the future.
 */
export async function test_api_user_token_refresh_valid(
  connection: api.IConnection,
) {
  // 1. Simulate generating an authorized session (join/login)
  const authorized: ITodoAppUser.IAuthorized =
    typia.random<ITodoAppUser.IAuthorized>();
  typia.assert(authorized); // Just in case

  // 2. Request token refresh using the authorized's refresh token
  const refreshed: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.refresh(connection, {
      body: {
        refresh_token: authorized.token.refresh,
      } satisfies ITodoAppUser.IRefresh,
    });
  typia.assert(refreshed);

  // 3. Assert core identity (id/email) stays the same
  TestValidator.equals(
    "id should not change after refresh",
    refreshed.id,
    authorized.id,
  );
  TestValidator.equals(
    "email should not change after refresh",
    refreshed.email,
    authorized.email,
  );

  // 4. Assert that token information is present and properly updated
  typia.assert<IAuthorizationToken>(refreshed.token);
  TestValidator.notEquals(
    "access token must be newly issued (should differ)",
    refreshed.token.access,
    authorized.token.access,
  );
  TestValidator.notEquals(
    "refresh token must be newly issued (should differ)",
    refreshed.token.refresh,
    authorized.token.refresh,
  );

  // 5. Assert that expiration fields are valid ISO date-times and in the future (relative to now)
  const now = Date.now();
  const accessExpiry = Date.parse(refreshed.token.expired_at);
  const refreshExpiry = Date.parse(refreshed.token.refreshable_until);
  TestValidator.predicate(
    "token.expired_at is in the future",
    accessExpiry > now,
  );
  TestValidator.predicate(
    "token.refreshable_until is in the future",
    refreshExpiry > now,
  );

  // 6. 'deleted_at' must be null or undefined for an active user
  TestValidator.equals(
    "deleted_at should be null or undefined for active user",
    refreshed.deleted_at ?? null,
    null,
  );
}
