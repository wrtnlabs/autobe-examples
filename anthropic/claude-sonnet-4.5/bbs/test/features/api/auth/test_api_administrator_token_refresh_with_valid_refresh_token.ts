import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";

/**
 * Test administrator token refresh with valid refresh token.
 *
 * Validates that administrators can maintain long-running authenticated
 * sessions through the refresh token mechanism without requiring credential
 * re-entry.
 *
 * Test workflow:
 *
 * 1. Create new administrator account through join operation
 * 2. Obtain initial access and refresh tokens from join response
 * 3. Use refresh token to request new access tokens
 * 4. Validate new access token is generated successfully
 * 5. Confirm token contains correct administrator information
 * 6. Verify session remains active throughout refresh process
 */
export async function test_api_administrator_token_refresh_with_valid_refresh_token(
  connection: api.IConnection,
) {
  // Step 1: Create new administrator account to obtain initial tokens
  const adminCredentials = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const joinResponse: IDiscussionBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminCredentials,
    });
  typia.assert(joinResponse);

  // Step 2: Validate join response structure
  TestValidator.predicate(
    "join response has administrator id",
    typeof joinResponse.id === "string" && joinResponse.id.length > 0,
  );

  TestValidator.predicate(
    "join response has token information",
    joinResponse.token !== null && joinResponse.token !== undefined,
  );

  // Step 3: Extract initial tokens
  const initialToken: IAuthorizationToken = joinResponse.token;
  typia.assert(initialToken);

  TestValidator.predicate(
    "initial access token exists",
    typeof initialToken.access === "string" && initialToken.access.length > 0,
  );

  TestValidator.predicate(
    "initial refresh token exists",
    typeof initialToken.refresh === "string" && initialToken.refresh.length > 0,
  );

  TestValidator.predicate(
    "initial access token expiration is set",
    typeof initialToken.expired_at === "string" &&
      initialToken.expired_at.length > 0,
  );

  TestValidator.predicate(
    "initial refresh token expiration is set",
    typeof initialToken.refreshable_until === "string" &&
      initialToken.refreshable_until.length > 0,
  );

  // Step 4: Use refresh token to obtain new access token
  const refreshRequest = {
    refresh_token: initialToken.refresh,
  } satisfies IDiscussionBoardAdministrator.IRefresh;

  const refreshResponse: IDiscussionBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.refresh(connection, {
      body: refreshRequest,
    });
  typia.assert(refreshResponse);

  // Step 5: Validate refresh response structure
  TestValidator.predicate(
    "refresh response has administrator id",
    typeof refreshResponse.id === "string" && refreshResponse.id.length > 0,
  );

  TestValidator.equals(
    "refresh response administrator id matches original",
    refreshResponse.id,
    joinResponse.id,
  );

  // Step 6: Extract refreshed tokens
  const refreshedToken: IAuthorizationToken = refreshResponse.token;
  typia.assert(refreshedToken);

  TestValidator.predicate(
    "refreshed access token exists",
    typeof refreshedToken.access === "string" &&
      refreshedToken.access.length > 0,
  );

  TestValidator.predicate(
    "refreshed refresh token exists",
    typeof refreshedToken.refresh === "string" &&
      refreshedToken.refresh.length > 0,
  );

  TestValidator.predicate(
    "refreshed access token expiration is set",
    typeof refreshedToken.expired_at === "string" &&
      refreshedToken.expired_at.length > 0,
  );

  TestValidator.predicate(
    "refreshed refresh token expiration is set",
    typeof refreshedToken.refreshable_until === "string" &&
      refreshedToken.refreshable_until.length > 0,
  );

  // Step 7: Verify new access token is different from initial (token rotation)
  TestValidator.notEquals(
    "new access token differs from initial access token",
    refreshedToken.access,
    initialToken.access,
  );
}
