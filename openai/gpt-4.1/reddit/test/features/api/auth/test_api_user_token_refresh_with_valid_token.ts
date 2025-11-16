import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Test successful user session continuation by submitting a valid, non-expired
 * refresh token for a user registered via join. Verifies a new JWT access and
 * refresh token pair is issued. Ensures the session is extended without
 * requiring re-authentication and the user's account status is 'active'.
 *
 * 1. Register a new user using a random email and password
 * 2. Validate initial registration succeeded, user is active and proper tokens are
 *    issued
 * 3. Use the initial refresh token to call the refresh endpoint
 * 4. Verify that a new authorized user object is returned with new tokens and
 *    account state remains 'active'
 * 5. Confirm the new tokens differ from the originals and are valid strings
 * 6. Ensure status is 'active' and other user core fields (id, email) remain the
 *    same
 */
export async function test_api_user_token_refresh_with_valid_token(
  connection: api.IConnection,
) {
  // Step 1: Register a new user
  const email: string = typia.random<string & tags.Format<"email">>();
  const password: string = typia.random<string & tags.Format<"password">>();
  const joinBody = { email, password } satisfies ICommunityPlatformUser.IJoin;
  const initialAuth: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: joinBody });
  typia.assert(initialAuth);

  // Step 2: Sanity check initial user registration and tokens
  TestValidator.equals(
    "account is active after join",
    initialAuth.status,
    "active",
  );
  TestValidator.predicate(
    "access token is non-empty string",
    typeof initialAuth.token.access === "string" &&
      initialAuth.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty string",
    typeof initialAuth.token.refresh === "string" &&
      initialAuth.token.refresh.length > 0,
  );

  // Step 3: Use the initial refresh token to obtain new tokens
  const refreshBody = {
    refreshToken: initialAuth.token.refresh,
  } satisfies ICommunityPlatformUser.IRefresh;
  const refreshedAuth: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.refresh(connection, { body: refreshBody });
  typia.assert(refreshedAuth);

  // Step 4: Validate new tokens are issued, id/email/status are unchanged
  TestValidator.equals(
    "user id remains same",
    refreshedAuth.id,
    initialAuth.id,
  );
  TestValidator.equals(
    "user email remains same",
    refreshedAuth.email,
    initialAuth.email,
  );
  TestValidator.equals(
    "account status remains active after refresh",
    refreshedAuth.status,
    "active",
  );
  TestValidator.notEquals(
    "refresh token changes after refresh",
    refreshedAuth.token.refresh,
    initialAuth.token.refresh,
  );
  TestValidator.notEquals(
    "access token changes after refresh",
    refreshedAuth.token.access,
    initialAuth.token.access,
  );
  TestValidator.predicate(
    "new access token is valid string",
    typeof refreshedAuth.token.access === "string" &&
      refreshedAuth.token.access.length > 0,
  );
  TestValidator.predicate(
    "new refresh token is valid string",
    typeof refreshedAuth.token.refresh === "string" &&
      refreshedAuth.token.refresh.length > 0,
  );
}
