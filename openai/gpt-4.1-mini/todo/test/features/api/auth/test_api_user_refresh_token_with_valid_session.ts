import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validates that a new user can register and then successfully refresh their
 * JWT tokens using the refresh token.
 *
 * This test covers the full token lifecycle for a user session:
 *
 * 1. Registering a new user account through /auth/user/join
 * 2. Extracting the issued refresh token from the join response
 * 3. Calling /auth/user/refresh with the valid refresh token to obtain new tokens
 * 4. Verifying the new tokens and user id returned are valid and distinct
 *
 * This ensures the session can continue securely without re-authentication,
 * validating token rotation and refresh logic in the authentication service.
 */
export async function test_api_user_refresh_token_with_valid_session(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const userCreateBody = {
    email: `user.${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "strong_password_123",
  } satisfies ITodoListUser.ICreate;

  const joinResponse: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userCreateBody,
    });
  typia.assert(joinResponse);

  // Extract the refresh token from the join response
  const { refresh: originalRefreshToken, access: originalAccessToken } =
    joinResponse.token;
  TestValidator.predicate(
    "join response returns valid refresh token",
    typeof originalRefreshToken === "string" && originalRefreshToken.length > 0,
  );
  TestValidator.predicate(
    "join response returns valid access token",
    typeof originalAccessToken === "string" && originalAccessToken.length > 0,
  );
  TestValidator.predicate(
    "join response returns valid user id",
    typeof joinResponse.id === "string" && joinResponse.id.length > 0,
  );

  // 2. Use the refresh token to obtain new tokens
  const refreshRequestBody = {
    refresh_token: originalRefreshToken,
  } satisfies ITodoListUser.IRefresh;

  const refreshResponse: ITodoListUser.IAuthorized =
    await api.functional.auth.user.refresh(connection, {
      body: refreshRequestBody,
    });
  typia.assert(refreshResponse);

  // Validate tokens are returned and user id matches
  TestValidator.equals(
    "refresh response user id matches original",
    refreshResponse.id,
    joinResponse.id,
  );

  TestValidator.predicate(
    "refresh response returns non-empty refresh token",
    typeof refreshResponse.token.refresh === "string" &&
      refreshResponse.token.refresh.length > 0,
  );

  TestValidator.predicate(
    "refresh response returns non-empty access token",
    typeof refreshResponse.token.access === "string" &&
      refreshResponse.token.access.length > 0,
  );

  // Validate that new tokens differ from original tokens indicating rotation
  TestValidator.notEquals(
    "refresh token should be rotated",
    refreshResponse.token.refresh,
    originalRefreshToken,
  );

  TestValidator.notEquals(
    "access token should be rotated",
    refreshResponse.token.access,
    originalAccessToken,
  );
}
